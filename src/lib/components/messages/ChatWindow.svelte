<script lang="ts">
	import MessageBubble from '$lib/components/messages/MessageBubble.svelte';
	import MessageInput from '$lib/components/messages/MessageInput.svelte';
	import { Button } from '$lib/components/ui/button';
	import { onMount } from 'svelte';
	import { websocketMessages } from '$lib/websocket';
	import { apiRequest } from '$lib/api';
	import { auth } from '$lib/stores/auth.svelte';

	export let conversationId: string;

	let messages: any[] = [];
	let conversationName = 'Loading...';
	let conversationType = 'direct'; // Placeholder, should be fetched

	let typingUsers: { [key: string]: boolean } = {};
	$: currentUserId = auth.state.user?.id;

	async function fetchMessages() {
		try {
			const response = await apiRequest('GET', `/messages?receiverID=${conversationId}`); // Assuming direct message for now
			messages = response.messages;
		} catch (error) {
			console.error('Failed to fetch messages:', error);
		}
	}

	onMount(() => {
		fetchMessages();

		// In a real app, fetch conversation details and messages here
		// For now, simulate fetching
		setTimeout(() => {
			conversationName = 'Alice Smith';
			conversationType = 'direct';
		}, 500);

		const unsubscribe = websocketMessages.subscribe((event) => {
			if (!event) return;

			switch (event.type) {
				case 'TypingEvent':
					const typingEvent = event.data;
					if (typingEvent.conversation_id === conversationId && typingEvent.user_id !== currentUserId) {
						typingUsers = { ...typingUsers, [typingEvent.user_id]: typingEvent.is_typing };
					}
					break;
				case 'Message': // Assuming backend sends messages with type 'Message'
					const newMessage = event.data;
					// Check if the message belongs to this conversation
					if ((newMessage.receiver_id === currentUserId && newMessage.sender_id === conversationId) ||
						(newMessage.sender_id === currentUserId && newMessage.receiver_id === conversationId) ||
						(newMessage.group_id === conversationId)) {
							
						// Add message if not already present (to avoid duplicates from initial fetch)
						if (!messages.some(m => m.id === newMessage.id)) {
							messages = [...messages, newMessage];
						}
					}
					break;
			}
		});

		return () => {
			unsubscribe();
		};
	});

	async function handleNewMessage(event: CustomEvent<string>) {
		const messageContent = event.detail;
		if (messageContent.trim()) {
			try {
				// Send message to backend via API
				const sentMessage = await apiRequest('POST', '/messages', {
					receiver_id: conversationId, // Assuming direct message
					content: messageContent,
					content_type: 'text',
				});
				// Message will be added via WebSocket event, so no need to add here
				console.log('Message sent:', sentMessage);
			} catch (error) {
				console.error('Failed to send message:', error);
				alert('Failed to send message.');
			}
		}
	}

	$: activeTypingUsers = Object.keys(typingUsers).filter(key => typingUsers[key]);
</script>

<div class="flex h-full flex-col">
	<!-- Chat Header -->
	<div class="flex items-center justify-between border-b border-gray-200 bg-white p-4 shadow-sm">
		<div class="flex items-center space-x-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-lg font-bold text-gray-600"
			>
				{conversationName.substring(0, 2)}
			</div>
			<div>
				<h3 class="font-semibold text-gray-900">{conversationName}</h3>
				{#if conversationType === 'direct'}
					<p class="text-sm text-gray-500">Active now</p>
				{:else}
					<p class="text-sm text-gray-500">3 members</p>
				{/if}
			</div>
		</div>
		<div class="flex space-x-2">
			<Button variant="ghost" size="icon" class="rounded-full">
				<!-- <Phone size={20} /> -->
				<span class="text-xl">📞</span>
			</Button>
			<Button variant="ghost" size="icon" class="rounded-full">
				<!-- <Video size={20} /> -->
				<span class="text-xl">📹</span>
			</Button>
			<Button variant="ghost" size="icon" class="rounded-full">
				<!-- <Info size={20} /> -->
				<span class="text-xl">ℹ️</span>
			</Button>
		</div>
	</div>

	<!-- Messages Area -->
	<div class="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
		{#each messages as message (message.id)}
			<MessageBubble {message} />
		{/each}

		{#if activeTypingUsers.length > 0}
			<div class="text-sm text-gray-500 italic">
				{activeTypingUsers.join(', ')} {activeTypingUsers.length > 1 ? 'are' : 'is'} typing...
			</div>
		{/if}
	</div>

	<!-- Message Input -->
	<div class="border-t border-gray-200 bg-white p-4">
		<MessageInput on:sendMessage={handleNewMessage} conversationId={conversationId} />
	</div>
</div>
