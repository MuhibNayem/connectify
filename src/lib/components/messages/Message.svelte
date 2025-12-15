<!--
Component to display a single message bubble.
It styles messages differently based on whether they were sent by the current user.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import type { Message } from '$lib/types';

	export let message: Message;

	const dispatch = createEventDispatcher();

	onMount(() => {
		dispatch('rendered', { messageId: message.id });
	});

	const isMe = auth.state.user?.id === message.sender_id;
</script>

<div class="my-2 flex items-start gap-2.5" class:flex-row-reverse={isMe}>
	<img
		class="h-8 w-8 rounded-full"
		src={message.sender?.avatar || `https://i.pravatar.cc/150?u=${message.sender_id}`}
		alt="{message.sender_name || 'User'}'s avatar"
	/>
	<div class="flex w-full max-w-[320px] flex-col gap-1">
		<div class="flex items-center space-x-2" class:justify-end={isMe}>
			<span class="text-sm font-semibold text-gray-900">{message?.sender_name || 'User'}</span>
			<span class="text-xs font-normal text-gray-500"
				>{new Date(message.created_at).toLocaleTimeString()}</span
			>
			{#if isMe}
				{#if message.seen_by && message.seen_by.length > 0}
					<!-- Blue double tick for seen -->
					<svg
						width="24px"
						height="24px"
						viewBox="0 0 16 16"
						xmlns="http://www.w3.org/2000/svg"
						version="1.1"
						fill="none"
						stroke="#7a72e3"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g
							id="SVGRepo_tracerCarrier"
							stroke-linecap="round"
							stroke-linejoin="round"
						></g><g id="SVGRepo_iconCarrier">
							<path d="m1.75 9.75 2.5 2.5m3.5-4 2.5-2.5m-4.5 4 2.5 2.5 6-6.5"></path>
						</g></svg
					>
				{:else if message.delivered_to && message.delivered_to.length > 0}
					<!-- Grey double tick for delivered -->
					<svg
						width="24px"
						height="24px"
						viewBox="0 0 16 16"
						xmlns="http://www.w3.org/2000/svg"
						version="1.1"
						fill="none"
						stroke="#8b8989"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g
							id="SVGRepo_tracerCarrier"
							stroke-linecap="round"
							stroke-linejoin="round"
						></g><g id="SVGRepo_iconCarrier">
							<path d="m1.75 9.75 2.5 2.5m3.5-4 2.5-2.5m-4.5 4 2.5 2.5 6-6.5"></path>
						</g></svg
					>
				{:else}
					<!-- Single tick for sent -->
					<svg
						width="20px"
						height="20px"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g
							id="SVGRepo_tracerCarrier"
							stroke-linecap="round"
							stroke-linejoin="round"
						></g><g id="SVGRepo_iconCarrier">
							<path
								d="M4.89163 13.2687L9.16582 17.5427L18.7085 8"
								stroke="#000000"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							></path>
						</g></svg
					>
				{/if}
			{/if}
		</div>
		<div
			class="leading-1.5 flex flex-col border-gray-200 p-4"
			class:bg-blue-500={isMe}
			class:text-white={isMe}
			class:rounded-e-xl={!isMe}
			class:rounded-es-xl={!isMe}
			class:bg-gray-100={!isMe}
			class:rounded-s-xl={isMe}
			class:rounded-ee-xl={isMe}
		>
			{#if message.content_type === 'TEXT' || message.content_type === 'text'}
				<p class="text-sm font-normal">{message.content}</p>
			{:else if message.content_type === 'IMAGE' || message.content_type === 'image'}
				<img src={message.content} alt="" class="max-w-xs rounded-lg" />
			{:else if message.content_type === 'VIDEO' || message.content_type === 'video'}
				<video src={message.content} controls class="max-w-xs rounded-lg"></video>
			{:else if message.content_type === 'FILE' || message.content_type === 'file'}
				<a
					href={message.content}
					target="_blank"
					rel="noopener noreferrer"
					class="text-sm font-normal underline">Download File</a
				>
			{/if}
		</div>
		<div class="mt-1 flex items-center space-x-2" class:justify-end={isMe}>
			{#if message.is_edited}
				<span class="text-xs font-normal text-gray-400">Edited</span>
			{/if}
			{#if message.reactions && message.reactions.length > 0}
				<div class="flex items-center rounded-full bg-gray-100 px-2 py-0.5">
					{#each message.reactions as reaction}
						<span>{reaction.emoji}</span>
					{/each}
					<span class="ml-1 text-xs text-gray-600">{message.reactions.length}</span>
				</div>
			{/if}
		</div>
	</div>
</div>
