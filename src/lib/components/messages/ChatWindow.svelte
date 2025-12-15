<!--
This is the main chat window component.
It orchestrates the display of messages and the message input field.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getMessages,
		sendMessage,
		markMessagesAsDelivered,
		getConversationSummaries,
		type ConversationSummary,
		markConversationAsSeen
	} from '$lib/api';
	import { formatDistanceToNow } from 'date-fns';
	import Message from './Message.svelte';
	import MessageInput from './MessageInput.svelte';
	import { websocketMessages } from '$lib/websocket';
	import { auth } from '$lib/stores/auth.svelte';
	import { presenceStore, type PresenceState } from '$lib/stores/presence';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { trackVisibility } from '$lib/actions/trackVisibility';

	let { conversationId } = $props<{ conversationId: string }>();

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

	onMount(async () => {
		await loadMessages();
		await loadConversationPartner();
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
				messages = response.messages.reverse();
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

	async function handleSendMessage(content: string) {
		if (!content.trim() || isSending) return;

		isSending = true;

		const [type, id] = conversationId.split('-');
		let payload: any = {
			content: content,
			content_type: 'text' // Default to text
		};

		if (type === 'group') {
			payload.group_id = id;
		} else if (type === 'user') {
			payload.receiver_id = id;
		} else {
			console.error('Invalid conversation ID format.');
			isSending = false;
			return;
		}

		// Optimistically add message with a temporary ID
		const tempId = `temp-${Date.now()}`;
		const optimisticMessage: Message = {
			id: tempId,
			sender_id: auth.state.user?.id || '',
			sender_name: auth.state.user?.username || 'You',
			content: content,
			content_type: 'text',
			created_at: new Date().toISOString(),
			is_deleted: false,
			is_edited: false,
			seen_by: [],
			delivered_to: [],
			// Add other fields as necessary, e.g., receiver_id or group_id
			...(type === 'user' && { receiver_id: id }),
			...(type === 'group' && { group_id: id })
		};
		messages.push(optimisticMessage);
		content = ''; // Clear input immediately

		try {
			const serverMessage = await sendMessage(payload);
			// Replace optimistic message with server-returned message
			messages = messages.map((msg) => (msg.id === tempId ? serverMessage : msg));
		} catch (e) {
			console.error('Send message failed:', e);
			// Remove optimistic message if send failed
			messages = messages.filter((msg) => msg.id !== tempId);
			// Optionally, show a 'failed to send' status for the message
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
		console.log('WebSocket event received in chat window:', event);
		if (!event) return;

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
					(newMessage.receiver_id === currentChatId || newMessage.sender_id === currentChatId)
				) {
					belongsToCurrentChat = true;
				}
				console.log('Current conversation type:', type, 'ID:', currentChatId);
				console.log('Message belongs to current chat:', belongsToCurrentChat);

				if (belongsToCurrentChat) {
					const messageExists = messages.find((m) => m.id === newMessage.id);
					console.log('Message already exists:', messageExists);
					if (!messageExists) {
						messages.push(newMessage);
						console.log('New message pushed to array:', newMessage);
					}
				}
				break;
			}
			case 'MESSAGE_EDITED_UPDATE': {
				const { message_id, new_content } = event.data;
				const messageIndex = messages.findIndex((m) => m.id === message_id);
				if (messageIndex !== -1) {
					messages[messageIndex].content = new_content;
					messages[messageIndex].is_edited = true;
				}
				break;
			}
			case 'MESSAGE_REACTION_UPDATE': {
				const { message_id, user_id, emoji, action } = event.data;
				const messageIndex = messages.findIndex((m) => m.id === message_id);
				if (messageIndex === -1) return;

				if (!messages[messageIndex].reactions) {
					messages[messageIndex].reactions = [];
				}

				const existingReactionIndex = messages[messageIndex].reactions.findIndex(
					(r: any) => r.user_id === user_id && r.emoji === emoji
				);

				if (action === 'add' && existingReactionIndex === -1) {
					messages[messageIndex].reactions.push({
						user_id,
						emoji,
						timestamp: new Date().toISOString()
					});
				} else if (action === 'remove' && existingReactionIndex !== -1) {
					messages[messageIndex].reactions.splice(existingReactionIndex, 1);
				}
				break;
			}
			case 'CONVERSATION_SEEN_UPDATE': {
				const { conversation_id, user_id, timestamp, is_group } = event.data;
				const [type, id] = conversationId.split('-');
				if (id === conversation_id) {
					messages.forEach((msg) => {
						if (new Date(msg.created_at) <= new Date(timestamp)) {
							if (!msg.seen_by.includes(user_id)) {
								msg.seen_by.push(user_id);
							}
						}
					});
				}
				break;
			}
			case 'MESSAGE_DELIVERED_UPDATE': {
				const { message_ids, deliverer_id } = event.data;
				messages.forEach((msg) => {
					if (message_ids.includes(msg.id)) {
						if (!msg.delivered_to) msg.delivered_to = [];
						if (!msg.delivered_to.includes(deliverer_id)) {
							msg.delivered_to.push(deliverer_id);
						}
					}
				});
				break;
			}
			case 'TYPING': {
				const { user_id, conversation_id, is_typing } = event.data;
				// Only show typing indicator if the event is for the current conversation
				// and the typing user is not the current authenticated user
				const [, id] = conversation_id.split('-');
				if (id === auth.state.user?.id && user_id !== auth.state.user?.id) {
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
		clearTimeout(seenDebounceTimer);
		seenDebounceTimer = setTimeout(() => {
			const [type, id] = conversationId.split('-');
			markConversationAsSeen(conversationId, message.created_at, type === 'group');
		}, 500);
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
		{:else}
			<h2 class="text-lg font-bold">Chat</h2>
		{/if}
	</header>

	<!-- Message Display Area -->
	<div bind:this={chatContainer} class="flex-1 overflow-y-auto bg-gray-50 p-4">
		{#if isLoading}
			<p>Loading messages...</p>
		{:else if error}
			<p class="text-red-500">{error}</p>
		{:else}
			{#each messages as message (message.id)}
				<div use:trackVisibility={{ onVisible: () => handleMessageVisible(message) }}>
					<Message {message} on:rendered={handleMessageRendered} />
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
	<MessageInput onSendMessage={handleSendMessage} {conversationId} />
</div>
