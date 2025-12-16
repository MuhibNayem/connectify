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
		markConversationAsSeen
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

	let showGroupInfo = $state(false);

	let { conversationId } = $props<{ conversationId: string }>();

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

	presenceStore.subscribe((value) => {
		presenceState = value;
	});

	// Queue for messages that have been rendered but not yet marked as delivered
	let deliveredQueue = new Set<string>();
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

		// Optimistically add message
		const tempId = `temp-${Date.now()}`;
		const optimisticMessage: MessageModel = {
			id: tempId,
			sender_id: auth.state.user?.id || '',
			sender_name: auth.state.user?.username || 'You',
			content: content,
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
			created_at: new Date().toISOString(),
			is_deleted: false,
			is_edited: false,
			seen_by: [],
			delivered_to: [],
			_optimistic_files: files,
			...(type === 'user' && { receiver_id: id }),
			...(type === 'group' && { group_id: id })
		};
		// Immutable update to ensure reactivity
		messages = [...messages, optimisticMessage];

		try {
			let payload: any;

			if (files.length > 0) {
				const formData = new FormData();
				formData.append('content', content);
				// Default content type if mixed, backend will refine
				formData.append('content_type', 'text');

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
					content: content,
					content_type: 'text'
				};
				if (type === 'group') {
					payload.group_id = id;
				} else {
					payload.receiver_id = id;
				}
			}

			const serverMessage = await sendMessage(payload);

			// Immediately emit a local event for ConversationList to update
			// This ensures the conversation moves to top instantly.
			// NOTE: This also triggers our own subscription to websocketMessages!
			websocketMessages.set({
				type: 'MESSAGE_CREATED',
				data: serverMessage
			});

			// Prevent duplicates:
			// If message was added by the subscription above (or real WS race), we just remove tempId.
			// Otherwise, we replace tempId with serverMessage.
			if (messages.some((m) => m.id === serverMessage.id)) {
				messages = messages.filter((msg) => msg.id !== tempId);
			} else {
				messages = messages.map((msg) => (msg.id === tempId ? serverMessage : msg));
			}
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
	websocketMessages.subscribe((event) => {
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
				const [connType, id] = conversation_id.split('-');

				// Logic:
				// 1. If it's a group chat, the conversation_id (e.g., group-123) must match current conversationId
				// 2. If it's a DM (e.g., user-MY_ID), the user_id (SENDER) must be the person I'm chatting with (currentChatId)

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
				<h2 class="text-lg font-bold">{conversationPartner.name}</h2>
				{#if !conversationPartner.is_group}
					<p class="text-sm text-gray-500">
						{#if presenceState[conversationPartner.id]?.status === 'online'}
							Online
						{:else if presenceState[conversationPartner.id]?.last_seen}
							Active {formatDistanceToNow(
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

			{#if conversationPartner.is_group}
				<div class="ml-auto">
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
</div>
