<!--
This is the main chat window component.
It orchestrates the display of messages and the message input field.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { getMessages, sendMessage, markMessagesAsSeen } from '$lib/api';
	import Message from './Message.svelte';
	import MessageInput from './MessageInput.svelte';
	import { websocketMessages } from '$lib/websocket';
	import { auth } from '$lib/stores/auth.svelte';

	let { conversationId } = $props<{ conversationId: string }>();

	console.log({ conversationId });

	let messages = $state<any[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let chatContainer: HTMLElement;
	let isOpponentTyping = $state(false);

	onMount(async () => {
		await loadMessages();
	});

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
			console.log('Fetched response:', response);
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

	async function handleSendMessage(content: string) {
		try {
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
				throw new Error('Invalid conversation ID format.');
			}

			const newMessage = await sendMessage(payload);
			messages.push(newMessage); // Optimistically add the new message
		} catch (e) {
			console.error('Send message failed:', e);
			// Handle failed message, e.g., show a 'failed to send' status
		}
	}

	// Scroll to the bottom of the chat container when messages change
	$effect(() => {
		console.log('Fetched messages:', messages[0]);
		if (chatContainer && messages) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	});

	// Handle real-time updates from WebSocket
	websocketMessages.subscribe((event) => {
		if (!event) return;

		const [type, currentChatId] = conversationId.split('-');

		switch (event.type) {
			case 'MESSAGE_CREATED': {
				const newMessage = event.data;
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

				if (belongsToCurrentChat) {
					if (!messages.find((m) => m.id === newMessage.id)) {
						                        messages.push(newMessage);
						                        // Mark message as read if current user is the receiver and window is focused
						                        if (document.hasFocus() && newMessage.receiver_id === auth.state.user?.id) {
						                            markAsRead(newMessage.id);
						                        }					}
				}
				break;
			}
			case 'MESSAGE_EDITED_UPDATE': {
				const { message_id, new_content } = event.data;
				const messageIndex = messages.findIndex((m) => m.id === message_id);
				                if (messageIndex !== -1) {
				                    messages[messageIndex].content = new_content;
				                    messages[messageIndex].is_edited = true;
				                }				break;
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
				                }			}
			case 'MESSAGE_READ_UPDATE': {
				const { message_ids, reader_id } = event.data;
				if (reader_id === auth.state.user?.id) {
					// The other user in the chat has read the messages
					                    messages.forEach((msg) => {
					                        if (message_ids.includes(msg.id)) {
					                            if (!msg.seen_by) msg.seen_by = [];
					                            if (!msg.seen_by.includes(reader_id)) {
					                                msg.seen_by.push(reader_id);
					                            }
					                        }
					                    });				}
				break;
			}
			case 'TYPING': {
				const { user_id, is_typing } = event.data;
				if (user_id === currentChatId) {
					// The other user is typing (assuming currentChatId is the other user's ID for direct messages)
					isOpponentTyping = is_typing;
					// Optional: add a timer to automatically set isOpponentTyping to false
				}
				break;
			}
		}
	});

	// --- Read Receipts ---
	let readQueue = new Set<string>();
	let debounceTimer: any;

	function markAsRead(messageId: string) {
		readQueue.add(messageId);
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			if (readQueue.size > 0) {
				await markMessagesAsSeen(Array.from(readQueue));
				readQueue.clear();
			}
		}, 1000); // Debounce for 1 second
	}

	onMount(() => {
		// Mark all initial messages as read
		const unreadIds = messages
			.filter(
				(m) => m.sender_id !== auth.state.user?.id && !m.seen_by?.includes(auth.state.user?.id)
			)
			.map((m) => m.id);
		if (unreadIds.length > 0) {
			unreadIds.forEach((id) => markAsRead(id));
		}
	});
</script>

<div class="flex h-full flex-col">
	<!-- Chat Header -->
	<header class="border-b border-gray-200 bg-white p-4">
		<!-- Placeholder for chat partner's name and status -->
		<h2 class="text-lg font-bold">Chat</h2>
	</header>

	<!-- Message Display Area -->
	<div bind:this={chatContainer} class="flex-1 overflow-y-auto bg-gray-50 p-4">
		{#if isLoading}
			<p>Loading messages...</p>
		{:else if error}
			<p class="text-red-500">{error}</p>
		{:else}
			{#each messages as message (message.id)}
				<Message {message} />
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
	<MessageInput onSendMessage={handleSendMessage} />
</div>
