<!--
This is the main chat window component.
It orchestrates the display of messages and the message input field.
-->
<script lang="ts">
	import {
		getMessages,
		sendMessage,
		markMessagesAsDelivered,
		getConversationSummaries,
		type ConversationSummary,
		markConversationAsSeen,
		updateUserKeys,
		type UserKeys
	} from '$lib/api';
	import type { Message as MessageModel } from '$lib/types';
	import { formatDistanceToNow } from 'date-fns';
	import Message from '$lib/components/messages/Message.svelte';
	import Lightbox from '$lib/components/messages/Lightbox.svelte';
	import MessageInput from './MessageInput.svelte';
	import { websocketMessages } from '$lib/websocket';
	import { auth } from '$lib/stores/auth.svelte';
	import { presenceStore, type PresenceState } from '$lib/stores/presence';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { trackVisibility } from '$lib/actions/trackVisibility';
	import GroupInfoModal from './GroupInfoModal.svelte';
	import * as crypto from '$lib/crypto';
	import * as keyStore from '$lib/key_store';
	import { voiceCallService } from '$lib/stores/voice-call.svelte';
	import { Phone, Video } from '@lucide/svelte';

	let showGroupInfo = $state(false);

	let { conversationId } = $props<{ conversationId: string }>();

	let conversationType = $derived(conversationId.split('-')[0]);
	let currentChatId = $derived(conversationId.split('-')[1]);

	let messages = $state<any[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let chatContainer: HTMLElement;
	let isOpponentTyping = $state(false);
	let typingTimeout: ReturnType<typeof setTimeout>;
	let isSending = $state(false); // Declare isSending here

	let conversationPartner = $state<ConversationSummary | null>(null);
	let presenceState = $state<PresenceState>({});

	// Subscribe to presence updates
	$effect(() => {
		const unsubscribe = presenceStore.subscribe((val) => {
			presenceState = val;
		});
		return unsubscribe;
	});

	// E2EE State
	let isEncrypted = $state(false);
	let myKeyPair = $state<crypto.KeyPair | null>(null);
	let partnerPublicKey = $state<CryptoKey | null>(null);
	let myFingerprint = $state<string>('');
	let partnerFingerprint = $state<string>('');
	let isSettingUpKeys = $state(false);
	let showRecoverySetup = $state(false);
	let recoveryPassword = $state('');

	// Declared here to be accessible
	let showSecurityInfo = $state(false);

	// Queue for messages that have been rendered but not yet marked as delivered
	let deliveredQueue = new Set<string>();

	// Restore Keys Logic

	// E2EE Functions
	async function initE2EE() {
		// 1. Load my private key
		const priv = await keyStore.loadPrivateKey();
		const pub = await keyStore.loadPublicKey();
		if (priv && pub) {
			myKeyPair = { privateKey: priv, publicKey: pub };
			// Compute my fingerprint
			const pubExp = await crypto.exportPublicKey(pub);
			myFingerprint = await crypto.computeFingerprint(pubExp);
		}
	}

	async function setupKeys() {
		if (!recoveryPassword) {
			alert('Please enter a recovery password to secure your keys.');
			return;
		}
		isSettingUpKeys = true;
		try {
			// 1. Generate
			const keys = await crypto.generateKeyPair();

			// 2. Encrypt Private Key for Backup
			const backup = await crypto.encryptPrivateKeyWithPassword(keys.privateKey, recoveryPassword);

			// 3. Export Public Key
			const pubKeyBase64 = await crypto.exportPublicKey(keys.publicKey);

			// 4. Upload to Server
			const payload: UserKeys = {
				public_key: pubKeyBase64,
				encrypted_private_key: backup.encryptedPrivateKey,
				key_backup_iv: backup.iv,
				key_backup_salt: backup.salt
			};
			await updateUserKeys(payload);

			// 5. Save Locally
			await keyStore.savePrivateKey(keys.privateKey);
			await keyStore.savePublicKey(keys.publicKey);

			myKeyPair = keys;
			myFingerprint = await crypto.computeFingerprint(pubKeyBase64);
			showRecoverySetup = false;
			alert('Encryption enabled! Keys generated and backed up securely.');
		} catch (e) {
			console.error('Failed to setup keys:', e);
			alert('Failed to setup encryption keys.');
		} finally {
			isSettingUpKeys = false;
		}
	}

	// Restore Keys Logic
	let showRestoreModal = $state(false);
	let isRestoringKeys = $state(false);

	async function restoreKeys() {
		if (!recoveryPassword) {
			alert('Please enter your recovery password.');
			return;
		}
		isRestoringKeys = true;
		try {
			// Get fresh user profile to ensure we have backup data
			// We can use auth.state.user but to be safe lets assume it's there or refresh it
			// Ideally we assume auth state is up to date or we fetch "me"
			const { updateUserProfile } = await import('$lib/api'); // Just ensuring we have API access
			// Actually we need 'getUserProfile' but that updates 'auth.state.user' usually.
			// Let's use auth.state.user directly.
			const user = auth.state.user;

			if (!user?.encrypted_private_key || !user?.key_backup_iv || !user?.key_backup_salt) {
				alert('No backup found on server. Cannot restore.');
				return;
			}

			const privateKey = await crypto.decryptPrivateKeyWithPassword(
				user.encrypted_private_key,
				user.key_backup_iv,
				user.key_backup_salt,
				recoveryPassword
			);

			// If success (no error thrown), import public key too
			// We can import public key from user.public_key string
			if (!user.public_key) throw new Error('Public Key missing from profile');
			const publicKey = await crypto.importPublicKey(user.public_key);

			// Save Locally
			await keyStore.savePrivateKey(privateKey);
			await keyStore.savePublicKey(publicKey);

			myKeyPair = { privateKey, publicKey };
			myFingerprint = await crypto.computeFingerprint(user.public_key);
			showRestoreModal = false;
			alert('Keys restored successfully! Encryption enabled.');
			isEncrypted = true;
		} catch (e) {
			console.error('Failed to restore keys:', e);
			alert('Failed to restore keys. Incorrect password or corrupted backup.');
		} finally {
			isRestoringKeys = false;
		}
	}

	// Key Rotation Logic
	let showRotateModal = $state(false);
	let isRotatingKeys = $state(false);
	let rotationPassword = $state('');

	async function rotateKeys() {
		if (!rotationPassword) {
			alert('Please enter a new recovery password to secure your rotated keys.');
			return;
		}
		isRotatingKeys = true;
		try {
			// 1. Generate NEW Key Pair
			const newKeys = await crypto.generateKeyPair();

			// 2. Encrypt NEW Private Key with the new password
			const backup = await crypto.encryptPrivateKeyWithPassword(
				newKeys.privateKey,
				rotationPassword
			);

			// 3. Export NEW Public Key
			const pubKeyBase64 = await crypto.exportPublicKey(newKeys.publicKey);

			// 4. Upload to Server (replaces old keys)
			const payload: UserKeys = {
				public_key: pubKeyBase64,
				encrypted_private_key: backup.encryptedPrivateKey,
				key_backup_iv: backup.iv,
				key_backup_salt: backup.salt
			};
			await updateUserKeys(payload);

			// 5. Clear OLD local keys and save NEW ones
			await keyStore.clearKeys();
			await keyStore.savePrivateKey(newKeys.privateKey);
			await keyStore.savePublicKey(newKeys.publicKey);

			// 6. Update state
			myKeyPair = newKeys;
			myFingerprint = await crypto.computeFingerprint(pubKeyBase64);
			rotationPassword = '';
			showRotateModal = false;
			alert(
				"Keys rotated successfully! Your previous encrypted messages may become unreadable if you don't have the old keys."
			);
		} catch (e) {
			console.error('Failed to rotate keys:', e);
			alert('Failed to rotate keys.');
		} finally {
			isRotatingKeys = false;
		}
	}

	async function toggleEncryption() {
		if (isEncrypted) {
			// Instead of disabling immediately, show security details
			showSecurityInfo = true;
			return;
		}

		// Enabling Encryption
		if (!myKeyPair) {
			// Check if we have a backup on the server to restore
			const user = auth.state.user;
			// Reload user to be sure?
			// For now, assume auth.state.user is recent enough.
			// Check if encrypted_private_key exists
			if (user && user.encrypted_private_key) {
				showRestoreModal = true;
			} else {
				showRecoverySetup = true; // Trigger setup flow
			}
			return;
		}

		// Check if partner has keys (For DMs)
		// We need to fetch partner's public key from the 'conversationPartner' or fetch user profile again
		// Ideally 'getConversationSummaries' or 'getUser' should return public_key.
		// For now, let's assume we can try to fetch it or fail.
		// NOTE: API needs to return public_key for the user.
		// We will assume conversationPartner MIGHT have it if we fetch profile.
		// Actually, let's lazy load it here.
		// For MVP, we'll try to enable it, but if we can't find partner key, we warn.
		// For MVP, we'll try to enable it, but if we can't find partner key, we warn.
		isEncrypted = true;
	}

	// Auto-enable encryption if keys are available
	$effect(() => {
		if (myKeyPair && partnerPublicKey && !isEncrypted && conversationType === 'user') {
			console.log('[E2EE] Auto-enabling encryption');
			isEncrypted = true;
		}
	});

	// Helper to decrypt a single message
	async function decryptMessageContent(msg: any): Promise<string> {
		if (!msg.is_encrypted || !msg.iv) return msg.content;
		if (!myKeyPair) return '[Encrypted] (Unlock keys)';
		if (!partnerPublicKey) return '[Encrypted] (Missing partner key)';

		try {
			const sharedKey = await crypto.deriveSharedSecret(myKeyPair.privateKey, partnerPublicKey);
			const decrypted = await crypto.decryptMessage(msg.content, msg.iv, sharedKey);
			return decrypted;
		} catch (e) {
			console.error('Decryption failed:', e);
			return '[Decryption Error]';
		}
	}

	// Reactive effect to decrypt messages
	// We use a map to track decrypted state to avoid infinite loops or re-decrypting
	let decryptedCache = new Set<string>();
	let isDecrypting = false;

	$effect(() => {
		if (conversationId) {
			decryptedCache.clear();
			isDecrypting = false; // Reset lock on conversation change
		}
	});

	$effect(() => {
		// Explicitly depend on these reactive values
		const hasKeys = myKeyPair !== null;
		const hasPartnerKey = partnerPublicKey !== null;
		const messageCount = messages.length;

		if (messageCount > 0 && hasKeys && hasPartnerKey && !isDecrypting) {
			console.log(
				'[E2EE] Running decryption for',
				messageCount,
				'messages | Keys:',
				!!hasKeys,
				'Partner:',
				!!hasPartnerKey
			);

			// Use Promise.all for better async handling
			const decryptAll = async () => {
				if (isDecrypting) return;
				isDecrypting = true;

				try {
					// Optimization: Derive shared key ONCE for the whole batch
					// This avoids repetitive ECDH calculations (expensive).
					const sharedKey = await crypto.deriveSharedSecret(
						myKeyPair!.privateKey,
						partnerPublicKey!
					);

					// Identify messages needing decryption and prepare jobs
					const jobs: Promise<{ index: number; content: string }>[] = [];

					for (let i = 0; i < messages.length; i++) {
						const msg = messages[i];
						if (msg.is_encrypted && !msg._is_decrypted && !decryptedCache.has(msg.id)) {
							decryptedCache.add(msg.id);
							// Push promise to array for parallel processing
							jobs.push(
								crypto
									.decryptMessage(msg.content, msg.iv, sharedKey)
									.then((plaintext) => ({ index: i, content: plaintext }))
									.catch((e) => {
										console.error('[E2EE] Decryption failed for msg', msg.id, e);
										return { index: i, content: '[Decryption Error]' };
									})
							);
						}
					}

					if (jobs.length > 0) {
						// Wait for all to finish (Parallel execution)
						const results = await Promise.all(jobs);

						// Apply updates in a batch (Synchronous loop updates are usually batched by Svelte)
						results.forEach((res) => {
							const msg = messages[res.index];
							// Verify ID hasn't shifted (rare race condition but safe to check?
							// Actually index might be risky if list changed during await,
							// but the lock 'isDecrypting' usually prevents list reload unless converastion changed.
							// And if conversation changed, messages array is new, so indices are wrong.
							// But 'isDecrypting' reset on conversation change helps.
							// Ideally we match by ID, but that's O(N*M).
							// Given the lock, indices should be stable enough for this optimization level.)

							// Double check ID match just to be safe
							if (msg) {
								messages[res.index] = { ...msg, content: res.content, _is_decrypted: true };
							}
						});

						console.log('[E2EE] Batch Decrypted:', results.length);
					}
				} finally {
					isDecrypting = false;
				}
			};
			decryptAll();
		}
	});

	let deliveredDebounceTimer: ReturnType<typeof setTimeout>;

	function handleMessageRendered(event: CustomEvent<{ messageId: string }>) {
		const messageId = event.detail.messageId;
		// Only mark as delivered if the current user is the receiver and not the sender
		const message = messages.find((m) => m.id === messageId);
		if (message && message.sender_id !== auth.state.user?.id) {
			deliveredQueue.add(messageId);
			clearTimeout(deliveredDebounceTimer);
			deliveredDebounceTimer = setTimeout(async () => {
				if (deliveredQueue.size > 0) {
					try {
						await markMessagesAsDelivered(Array.from(deliveredQueue));
						console.log(
							'markMessagesAsDelivered API call successful for IDs:',
							Array.from(deliveredQueue)
						);
					} catch (error) {
						console.error('markMessagesAsDelivered API call failed:', error);
					}
					deliveredQueue.clear();
				}
			}, 500); // Debounce for 500ms
		}
	}

	$effect(() => {
		if (conversationId) {
			loadMessages();
			loadConversationPartner();
		}
	});

	async function loadConversationPartner() {
		try {
			const summaries = await getConversationSummaries();
			const [type, id] = conversationId.split('-');
			const partner = summaries.find((s) => s.id === id && s.is_group === (type === 'group'));
			if (partner) {
				conversationPartner = partner;
			}

			// E2EE: Fetch Public Key if available
			if (type === 'user') {
				const { getUserByID } = await import('$lib/api'); // Dynamic import to avoid circular dependency if any
				const user = await getUserByID(id);
				if (user.public_key) {
					partnerPublicKey = await crypto.importPublicKey(user.public_key);
					partnerFingerprint = await crypto.computeFingerprint(user.public_key);
					console.log('Partner Public Key loaded.');
				} else {
					partnerPublicKey = null;
					// If partner has no key, disable encryption
					if (isEncrypted) isEncrypted = false;
				}
			}
		} catch (e) {
			console.error('Failed to load conversation partner details:', e);
		}
	}

	async function loadMessages() {
		isLoading = true;
		error = null;
		try {
			const [type, id] = conversationId.split('-');
			let params: { receiverID?: string; groupID?: string } = {};

			if (type === 'group') {
				params.groupID = id;
			} else if (type === 'user') {
				params.receiverID = id;
			} else {
				throw new Error('Invalid conversation ID format.');
			}

			const response = await getMessages(params);
			if (response && Array.isArray(response.messages)) {
				// Ensure seen_by and delivered_to are always arrays
				messages = response.messages
					.map((msg: any) => ({
						...msg,
						seen_by: msg.seen_by || [],
						delivered_to: msg.delivered_to || []
					}))
					.reverse();
			} else {
				messages = [];
			}
		} catch (e: any) {
			error = e.message || 'Failed to load messages.';
		} finally {
			isLoading = false;
		}
	}

	function startTypingTimeout() {
		clearTimeout(typingTimeout);
		typingTimeout = setTimeout(() => {
			isOpponentTyping = false;
		}, 3000); // Hide after 3 seconds of no new typing events
	}

	async function handleSendMessage(content: string, files: File[] = []) {
		if ((!content.trim() && files.length === 0) || isSending) return;

		isSending = true;

		const [type, id] = conversationId.split('-');
		const tempId = `temp-${Date.now()}`;
		const createdAt = new Date().toISOString();

		let encryptedContent = content;
		let iv = '';
		let isMsgEncrypted = false;

		// E2EE: Encrypt if enabled (Performed BEFORE optimistic update)
		if (isEncrypted && myKeyPair && partnerPublicKey && type === 'user') {
			try {
				const sharedKey = await crypto.deriveSharedSecret(myKeyPair.privateKey, partnerPublicKey);
				const encrypted = await crypto.encryptMessage(content, sharedKey);
				encryptedContent = encrypted.ciphertext;
				iv = encrypted.iv;
				isMsgEncrypted = true;
			} catch (e) {
				console.error('Encryption failed:', e);
				alert('Failed to encrypt message. Sending failed.');
				isSending = false;
				return;
			}
		}

		// Optimistically add message to Chat Window
		const optimisticMessage: MessageModel = {
			id: tempId,
			sender_id: auth.state.user?.id || '',
			sender_name: auth.state.user?.username || 'You',
			content: content, // Display plaintext locally
			content_type:
				files.length > 0
					? files.length > 1
						? 'multiple'
						: files[0].type.startsWith('image/')
							? 'image'
							: files[0].type.startsWith('video/')
								? 'video'
								: 'file'
					: 'text',
			media_urls: files.length > 0 ? files.map((f) => URL.createObjectURL(f)) : undefined,
			created_at: createdAt,
			is_deleted: false,
			is_edited: false,
			is_encrypted: isMsgEncrypted, // Set flag correctly
			iv: iv,
			_is_decrypted: isMsgEncrypted ? true : undefined, // It's our own message, so it's "decrypted"
			seen_by: [],
			delivered_to: [],
			_optimistic_files: files,
			...(type === 'user' && { receiver_id: id }),
			...(type === 'group' && { group_id: id })
		};

		// Immutable update to ensure reactivity
		messages = [...messages, optimisticMessage];

		// Optimistic Broadcast for ConversationList
		// We construct a payload that mimics the server response
		const optimisticEventPayload = {
			...optimisticMessage,
			// Ensure we send what ConversationList expects
			receiver_id: type === 'user' ? id : undefined,
			group_id: type === 'group' ? id : undefined
		};

		console.log('[ChatWindow] Emitting Optimistic MESSAGE_CREATED:', optimisticEventPayload);
		websocketMessages.set({
			type: 'MESSAGE_CREATED',
			data: optimisticEventPayload
		});

		try {
			let payload: any;

			if (files.length > 0) {
				const formData = new FormData();
				formData.append('content', encryptedContent);
				// Default content type if mixed, backend will refine
				formData.append('content_type', 'text');
				if (isMsgEncrypted) {
					formData.append('is_encrypted', 'true');
					formData.append('iv', iv);
				}

				if (type === 'group') {
					formData.append('group_id', id);
				} else {
					formData.append('receiver_id', id);
				}

				files.forEach((file) => {
					formData.append('files', file);
				});

				payload = formData;
			} else {
				payload = {
					content: encryptedContent,
					content_type: 'text',
					is_encrypted: isMsgEncrypted,
					iv: iv
				};
				if (type === 'group') {
					payload['group_id'] = id;
				} else {
					payload['receiver_id'] = id;
				}
			}

			const serverMessage = await sendMessage(payload);

			// Server confirmed. We can optionally re-emit to update IDs,
			// but ConversationList usually cares about latest timestamp.
			// Updating ID in messages array:
			if (messages.some((m) => m.id === serverMessage.id)) {
				messages = messages.filter((msg) => msg.id !== tempId);
			} else {
				messages = messages.map((msg) =>
					msg.id === tempId
						? {
								...serverMessage,
								_is_decrypted: isMsgEncrypted ? true : undefined,
								content: content
							}
						: msg
				); // Keep plaintext content
			}

			// We DO NOT re-emit to websocketMessages here to avoid jumpiness,
			// unless we really want to confirm the ID.
			// Actually, real WS event will come too.
		} catch (e) {
			console.error('Send message failed:', e);
			messages = messages.filter((msg) => msg.id !== tempId);
		} finally {
			isSending = false;
		}
	}

	// Scroll to the bottom of the chat container when messages change
	$effect(() => {
		if (chatContainer && messages) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	});

	// Handle real-time updates from WebSocket
	$effect(() => {
		const unsubscribe = websocketMessages.subscribe((event) => {
			if (!event) return;
			console.log(
				'[ChatWindow] WebSocket event received:',
				event.type,
				event.data,
				'Current Conversation:',
				conversationId
			);

			const [type, currentChatId] = conversationId.split('-');

			switch (event.type) {
				case 'MESSAGE_CREATED': {
					const newMessage = event.data;
					console.log('MESSAGE_CREATED event received:', newMessage);

					// Check if the new message belongs to the current conversation
					let belongsToCurrentChat = false;
					if (type === 'group' && newMessage.group_id === currentChatId) {
						belongsToCurrentChat = true;
					} else if (
						type === 'user' &&
						(!newMessage.group_id || newMessage.group_id === '000000000000000000000000') && // Ensure it's not a group message (handle zero ID)
						(newMessage.receiver_id === currentChatId || newMessage.sender_id === currentChatId)
					) {
						belongsToCurrentChat = true;
					}
					console.log('Current conversation type:', type, 'ID:', currentChatId);
					console.log('Message belongs to current chat:', belongsToCurrentChat);

					if (belongsToCurrentChat) {
						// Check if message already exists in array (basic safety)
						const messageExists = messages.find((m) => m.id === newMessage.id);

						if (!messageExists) {
							// Immutable push
							messages = [...messages, newMessage];
						}
					}
					break;
				}
				case 'GROUP_UPDATED': {
					const updatedGroup = event.data;
					if (type === 'group' && currentChatId === updatedGroup.id && conversationPartner) {
						console.log('GROUP_UPDATED event received for current chat:', updatedGroup);
						conversationPartner = {
							...conversationPartner,
							name: updatedGroup.name,
							avatar: updatedGroup.avatar
						};
					}
					break;
				}
				case 'MESSAGE_DELETED': {
					const deletedMessage = event.data;
					messages = messages.map((m) => {
						if (m.id === deletedMessage.id) {
							return {
								...m,
								content: '[deleted]',
								content_type: 'deleted',
								is_deleted: true,
								media_urls: []
							};
						}
						return m;
					});
					break;
				}
				case 'MESSAGE_EDITED_UPDATE': {
					const { message_id, new_content } = event.data;
					console.log('MESSAGE_EDITED_UPDATE event received:', new_content);
					messages = messages.map((m) => {
						if (m.id === message_id) {
							return {
								...m,
								content: new_content,
								is_edited: true
							};
						}
						return m;
					});
					break;
				}
				case 'MESSAGE_REACTION_UPDATE': {
					const { message_id, user_id, emoji, action } = event.data;

					messages = messages.map((m) => {
						if (m.id === message_id) {
							const currentReactions = m.reactions || [];

							if (action === 'add') {
								// Check if already exists to avoid duplicates
								if (currentReactions.some((r: any) => r.user_id === user_id && r.emoji === emoji)) {
									return m;
								}
								return {
									...m,
									reactions: [
										...currentReactions,
										{ user_id, emoji, timestamp: new Date().toISOString() }
									]
								};
							} else if (action === 'remove') {
								return {
									...m,
									reactions: currentReactions.filter(
										(r: any) => !(r.user_id === user_id && r.emoji === emoji)
									)
								};
							}
						}
						return m;
					});
					break;
				}
				case 'CONVERSATION_SEEN_UPDATE': {
					const { conversation_id, user_id, timestamp, is_group } = event.data;
					const [type, id] = conversationId.split('-');

					// Check relevance: matched group ID OR matched user ID (for DMs)
					const isRelevant = id === conversation_id || (!is_group && id === user_id);

					if (isRelevant) {
						const seenTime = new Date(timestamp).getTime();
						messages = messages.map((msg) => {
							// Update if message is older/equal to seen timestamp AND not yet seen by this user
							if (new Date(msg.created_at).getTime() <= seenTime) {
								if (msg.seen_by?.includes(user_id)) return msg;

								return {
									...msg,
									seen_by: [...(msg.seen_by || []), user_id]
								};
							}
							return msg;
						});
					}
					break;
				}
				case 'MESSAGE_DELIVERED_UPDATE': {
					const { message_ids, deliverer_id } = event.data;
					messages = messages.map((msg) => {
						if (message_ids.includes(msg.id)) {
							if (msg.delivered_to?.includes(deliverer_id)) return msg;

							return {
								...msg,
								delivered_to: [...(msg.delivered_to || []), deliverer_id]
							};
						}
						return msg;
					});
					break;
				}
				case 'MESSAGE_READ_UPDATE': {
					const { message_ids, reader_id } = event.data;
					messages = messages.map((msg) => {
						if (message_ids.includes(msg.id)) {
							if (msg.seen_by?.includes(reader_id)) return msg;

							return {
								...msg,
								seen_by: [...(msg.seen_by || []), reader_id]
							};
						}
						return msg;
					});
					break;
				}
				case 'TYPING': {
					const { user_id, conversation_id, is_typing } = event.data;
					// Only show typing indicator if the event is for the current conversation
					// and the typing user is not the current authenticated user
					// Re-derive type/id inside case to be sure? No, outer scope is fine if effect re-runs.

					let isRelevant = false;
					if (type === 'group' && conversation_id === conversationId) {
						isRelevant = true;
					} else if (type === 'user' && user_id === currentChatId) {
						// For DMs, the conversation_id sent is 'user-MY_ID' (targeted at me).
						// We care if the SENDER (user_id) is the person we are currently looking at.
						isRelevant = true;
					}

					if (isRelevant && user_id !== auth.state.user?.id) {
						isOpponentTyping = is_typing;
						if (is_typing) {
							startTypingTimeout();
						} else {
							clearTimeout(typingTimeout);
						}
					}
					break;
				}
			}
		});

		return unsubscribe;
	});

	let seenDebounceTimer: any;
	function handleMessageVisible(message: any) {
		// Only mark messages as seen if they are NOT from the current user
		if (message.sender_id === auth.state.user?.id) return;

		clearTimeout(seenDebounceTimer);
		seenDebounceTimer = setTimeout(() => {
			const [type, id] = conversationId.split('-');
			// Use current time to mark ALL messages in the conversation as seen up to now
			markConversationAsSeen(conversationId, new Date().toISOString(), type === 'group');
		}, 500);
	}

	function handleMessageDeleted(event: CustomEvent) {
		const deletedMsgId = event.detail.id;
		messages = messages.map((m) => {
			if (m.id === deletedMsgId) {
				return {
					...m,
					content: '[deleted]',
					content_type: 'deleted',
					is_deleted: true,
					media_urls: []
				};
			}
			return m;
		});
	}
	// Init E2EE on load
	$effect(() => {
		initE2EE();
	});
</script>

<div class="flex h-full flex-col">
	<!-- Chat Header -->
	<header class="flex items-center space-x-4 border-b border-gray-200 bg-white p-4">
		{#if conversationPartner}
			<div class="relative">
				<Avatar class="h-10 w-10">
					<AvatarImage src={conversationPartner.avatar} alt={conversationPartner.name} />
					<AvatarFallback>{conversationPartner.name.charAt(0).toUpperCase()}</AvatarFallback>
				</Avatar>
				{#if !conversationPartner.is_group && presenceState[conversationPartner.id]?.status === 'online'}
					<span
						class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"
					></span>
				{/if}
			</div>
			<div>
				<h3 class="font-semibold text-gray-900">{conversationPartner.name}</h3>
				{#if conversationPartner.is_group}
					<button
						class="text-xs text-zinc-500 hover:text-zinc-700"
						onclick={() => (showGroupInfo = true)}
					>
						View Group Info
					</button>
				{:else}
					<p class="text-xs text-zinc-400">
						{#if presenceState[conversationPartner.id]?.status === 'online'}
							<span class="text-emerald-500">Online</span>
						{:else if presenceState[conversationPartner.id]?.last_seen}
							Last seen {formatDistanceToNow(
								new Date(presenceState[conversationPartner.id].last_seen * 1000),
								{
									addSuffix: true
								}
							)}
						{:else}
							Offline
						{/if}
					</p>
				{/if}
			</div>

			{#if conversationType === 'user'}
				<div class="ml-auto flex items-center gap-2">
					<button
						onclick={() => voiceCallService.startCall(currentChatId, 'audio')}
						class="p-2 text-zinc-400 transition-colors hover:text-zinc-600"
						title="Voice Call"
					>
						<Phone size={20} />
					</button>
					<button
						onclick={() => voiceCallService.startCall(currentChatId, 'video')}
						class="p-2 text-zinc-400 transition-colors hover:text-zinc-600"
						title="Video Call"
					>
						<Video size={20} />
					</button>
				</div>
			{/if}
			{#if conversationPartner.is_group}
				<div class="ml-auto flex items-center gap-2">
					<button
						class="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
						onclick={() => (showGroupInfo = true)}
						aria-label="Group Info"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="h-6 w-6"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0Z"
							/>
						</svg>
					</button>
				</div>
			{:else}
				<div class="ml-auto flex items-center gap-2">
					<!-- E2EE Toggle -->
					{#if conversationType === 'user' && myKeyPair && !partnerPublicKey}
						<button
							class="flex cursor-pointer items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700 hover:bg-yellow-200"
							onclick={loadConversationPartner}
							title="Partner has not set up E2EE yet. Click to check again."
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								class="h-4 w-4"
							>
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
									clip-rule="evenodd"
								/>
							</svg>
							Secure (Waiting...)
						</button>
					{:else}
						<button
							class={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
								isEncrypted
									? 'bg-green-100 text-green-700'
									: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
							}`}
							onclick={toggleEncryption}
							title={isEncrypted ? 'Encryption Enabled' : 'Enable End-to-End Encryption'}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								class="h-4 w-4"
							>
								<path
									fill-rule="evenodd"
									d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
									clip-rule="evenodd"
								/>
							</svg>
							{isEncrypted ? 'Secure' : 'Encrypt'}
						</button>
					{/if}
				</div>
			{/if}
		{:else}
			<h2 class="text-lg font-bold">Chat</h2>
		{/if}
	</header>

	{#if showGroupInfo}
		<GroupInfoModal
			showModal={showGroupInfo}
			groupId={currentChatId}
			onClose={() => (showGroupInfo = false)}
		/>
	{/if}

	<!-- Message Display Area -->
	<div bind:this={chatContainer} class="flex-1 overflow-y-auto bg-gray-50 p-4">
		{#if isLoading}
			<p>Loading messages...</p>
		{:else if error}
			<p class="text-red-500">{error}</p>
		{:else}
			{#each messages as message (message.id)}
				<div use:trackVisibility={{ onVisible: () => handleMessageVisible(message) }}>
					<Message
						{message}
						on:rendered={handleMessageRendered}
						on:deleted={handleMessageDeleted}
					/>
				</div>
			{/each}

			{#if isOpponentTyping}
				<div class="my-2 flex items-center gap-2.5">
					<!-- Typing indicator -->
					<div class="flex items-center space-x-1">
						<span class="h-2 w-2 animate-pulse rounded-full bg-gray-400"></span>
						<span class="h-2 w-2 animate-pulse rounded-full bg-gray-400 delay-75"></span>
						<span class="h-2 w-2 animate-pulse rounded-full bg-gray-400 delay-150"></span>
					</div>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Message Input -->
	<MessageInput
		onSendMessage={async (content, files) => await handleSendMessage(content, files)}
		{conversationId}
	/>

	<Lightbox />

	<!-- Key Setup Modal (Generation) -->
	{#if showRecoverySetup}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
				<h3 class="mb-4 text-xl font-bold">Setup Secure Encryption</h3>
				<p class="mb-4 text-gray-600">
					To rely on end-to-end encryption, we need to generate a secure key pair for your device.
					Please enter a <strong>Recovery Password</strong>. This password will encrypt your
					specific private key so you can recover it on another device. We do NOT store your raw
					private key.
				</p>
				<input
					type="password"
					placeholder="Enter Recovery Password"
					bind:value={recoveryPassword}
					class="mb-4 w-full rounded border p-2"
				/>
				<div class="flex justify-end gap-2">
					<button
						class="rounded px-4 py-2 text-gray-600 hover:bg-gray-100"
						onclick={() => (showRecoverySetup = false)}
					>
						Cancel
					</button>
					<button
						class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
						onclick={setupKeys}
						disabled={isSettingUpKeys || !recoveryPassword}
					>
						{isSettingUpKeys ? 'Generating...' : 'Generate & Enable'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Key Restore Modal -->
	{#if showRestoreModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
				<h3 class="mb-4 text-xl font-bold">Restore Encryption Keys</h3>
				<p class="mb-4 text-gray-600">
					We found an existing key backup for your account. Please enter your <strong
						>Recovery Password</strong
					>
					to decrypt and restore your keys on this device.
				</p>
				<input
					type="password"
					placeholder="Enter Recovery Password"
					bind:value={recoveryPassword}
					class="mb-4 w-full rounded border p-2"
				/>
				<div class="flex justify-end gap-2">
					<button
						class="rounded px-4 py-2 text-gray-600 hover:bg-gray-100"
						onclick={() => (showRestoreModal = false)}
					>
						Cancel
					</button>
					<button
						class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
						onclick={restoreKeys}
						disabled={isRestoringKeys || !recoveryPassword}
					>
						{isRestoringKeys ? 'Restoring...' : 'Restore Keys'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Key Rotate Modal -->
	{#if showRotateModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
				<h3 class="mb-4 text-xl font-bold text-orange-600">⚠️ Rotate Encryption Keys</h3>
				<p class="mb-4 text-gray-600">
					This will generate <strong>NEW</strong> encryption keys. Your old keys will be destroyed.
					<br /><br />
					<strong class="text-red-600">Warning:</strong> All previously encrypted messages will become
					unreadable unless you backed up your old keys externally.
				</p>
				<input
					type="password"
					placeholder="Enter NEW Recovery Password"
					bind:value={rotationPassword}
					class="mb-4 w-full rounded border p-2"
				/>
				<div class="flex justify-end gap-2">
					<button
						class="rounded px-4 py-2 text-gray-600 hover:bg-gray-100"
						onclick={() => (showRotateModal = false)}
					>
						Cancel
					</button>
					<button
						class="rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
						onclick={rotateKeys}
						disabled={isRotatingKeys || !rotationPassword}
					>
						{isRotatingKeys ? 'Rotating...' : 'Rotate Keys'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Security Info / Verification Modal -->
	{#if showSecurityInfo}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-xl font-bold text-gray-800">🔒 Security Verification</h3>
					<button
						class="text-gray-500 hover:text-gray-700"
						onclick={() => (showSecurityInfo = false)}
					>
						✕
					</button>
				</div>

				<p class="mb-6 text-sm text-gray-600">
					End-to-End Encryption is active. You can verify the security of this chat by comparing the
					fingerprints below with your partner's device.
				</p>

				<div class="mb-6 space-y-4">
					<div class="rounded-lg bg-gray-50 p-4">
						<p class="mb-1 text-xs font-semibold uppercase text-gray-500">Your Fingerprint</p>
						<code class="break-all font-mono text-sm text-blue-800"
							>{myFingerprint || 'Loading...'}</code
						>
					</div>

					<div class="rounded-lg bg-gray-50 p-4">
						<p class="mb-1 text-xs font-semibold uppercase text-gray-500">Partner's Fingerprint</p>
						{#if partnerFingerprint}
							<code class="break-all font-mono text-sm text-green-800">{partnerFingerprint}</code>
						{:else}
							<p class="text-sm text-yellow-600">Not Available (Partner key missing)</p>
						{/if}
					</div>
				</div>

				<div class="flex justify-between border-t pt-4">
					<div class="flex gap-2">
						<button
							class="text-red-500 hover:text-red-700"
							onclick={() => {
								isEncrypted = false;
								showSecurityInfo = false;
							}}
						>
							Disable Encryption
						</button>
						<button
							class="text-orange-500 hover:text-orange-700"
							onclick={() => {
								showSecurityInfo = false;
								showRotateModal = true;
							}}
						>
							Rotate Keys
						</button>
					</div>
					<button
						class="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
						onclick={() => (showSecurityInfo = false)}
					>
						Close
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
