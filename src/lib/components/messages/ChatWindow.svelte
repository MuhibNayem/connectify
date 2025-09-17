<script lang="ts">
	import MessageBubble from '$lib/components/messages/MessageBubble.svelte';
	import MessageInput from '$lib/components/messages/MessageInput.svelte';
	import { Button } from '$lib/components/ui/button'; // Adjust the path if needed
	// Assuming icons like Phone, Video, Info from Lucide Svelte
	// import { Phone, Video, Info } from 'lucide-svelte';

	export let conversationId: string;

	// Placeholder for messages
	// In a real app, these would be fetched from API and updated via WebSocket
	let messages = [
		{ id: 1, sender: 'Alice Smith', content: 'Hi there!', time: '10:00 AM', isSelf: false },
		{ id: 2, sender: 'You', content: 'Hey Alice! How are you?', time: '10:01 AM', isSelf: true },
		{
			id: 3,
			sender: 'Alice Smith',
			content: 'Im good, thanks! Just working on some project stuff.',
			time: '10:05 AM',
			isSelf: false
		},
		{
			id: 4,
			sender: 'You',
			content: 'Nice! Let me know if you need any help.',
			time: '10:06 AM',
			isSelf: true
		}
	];

	// Placeholder for conversation details
	// In a real app, this would be fetched based on conversationId
	let conversationName = 'Alice Smith'; // Or 'Project Team' if group
	let conversationType = 'direct'; // Or 'group'

	function handleNewMessage(event: CustomEvent<string>) {
		const newMessageContent = event.detail;
		if (newMessageContent.trim()) {
			const newMessage = {
				id: messages.length + 1,
				sender: 'You', // Placeholder
				content: newMessageContent,
				time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
				isSelf: true
			};
			messages = [...messages, newMessage];
			// In a real app, send this message to the backend via API
			console.log('Sending message:', newMessageContent);
		}
	}
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
	</div>

	<!-- Message Input -->
	<div class="border-t border-gray-200 bg-white p-4">
		<MessageInput on:sendMessage={handleNewMessage} />
	</div>
</div>
