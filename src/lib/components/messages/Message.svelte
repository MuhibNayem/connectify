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

	function parseContent(text: string) {
		if (!text) return '';
		// Replace URL with links
		// Replace @username with links
		return text.replace(
			/@(\w+)/g,
			'<a href="/profile/$1" class="font-semibold hover:underline">$1</a>'
		);
	}

	function getMediaType(url: string, index: number, msg: Message): MediaItem {
		// 1. Check optimistic file type if available
		if (msg._optimistic_files?.[index]) {
			const t = msg._optimistic_files[index].type;
			if (t.startsWith('image/'))
				return { url, type: 'image', name: msg._optimistic_files[index].name };
			if (t.startsWith('video/'))
				return { url, type: 'video', name: msg._optimistic_files[index].name };
			return { url, type: 'file', name: msg._optimistic_files[index].name };
		}

		// 2. Check extension
		let ext = '';
		try {
			const pathname = new URL(url, 'http://dummy.com').pathname;
			ext = pathname.split('.').pop()?.toLowerCase() || '';
		} catch {
			ext = url.split('.').pop()?.toLowerCase() || '';
		}

		const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'svg', 'tiff'];
		const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'quicktime', 'm4v', 'avi', 'mkv'];

		if (imageExts.includes(ext)) return { url, type: 'image' };
		if (videoExts.includes(ext)) return { url, type: 'video' };

		// 3. Fallback to content_type if single file
		if (msg.media_urls?.length === 1) {
			if (msg.content_type === 'image' && !ext) return { url, type: 'image' };
			if (msg.content_type === 'video' && !ext) return { url, type: 'video' };
		}

		return { url, type: 'file' };
	}

	type MediaItem = { url: string; type: 'image' | 'video' | 'file'; name?: string };

	let mediaItems: MediaItem[] = [];
	let gridMedia: MediaItem[] = [];
	let attachments: MediaItem[] = [];

	$: mediaItems = message.media_urls?.map((url, i) => getMediaType(url, i, message)) || [];
	$: gridMedia = mediaItems.filter((m) => m.type === 'image' || m.type === 'video');
	$: attachments = mediaItems.filter((m) => m.type === 'file');

	function handleImgError(e: Event) {
		const target = e.currentTarget as HTMLImageElement;
		target.style.display = 'none';
		// Show fallback
		target.nextElementSibling?.classList.remove('hidden');
	}
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
			<!-- Split media into Grid (Images/Videos) and List (Files) -->
			<!-- Split media into Grid (Images/Videos) and List (Files) -->
			<!-- Logic moved to script -->

			<!-- Media Grid -->
			{#if gridMedia.length > 0}
				<div
					class="mb-1 grid gap-0.5 overflow-hidden rounded-xl
					{gridMedia.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}"
				>
					{#each gridMedia.slice(0, 4) as item, i}
						<div
							class="relative aspect-square w-full
							{gridMedia.length === 3 && i === 0 ? 'col-span-2 aspect-[2/1]' : ''}
							"
						>
							{#if item.type === 'video'}
								<!-- svelte-ignore a11y-media-has-caption -->
								<video src={item.url} controls class="h-full w-full bg-black object-cover"></video>
							{:else}
								<img
									src={item.url}
									alt="Attachment"
									class="h-full w-full cursor-pointer bg-gray-100 object-cover transition-opacity hover:opacity-90"
									on:error={handleImgError}
								/>
							{/if}

							<!-- Overlay for +X items -->
							{#if gridMedia.length > 4 && i === 3}
								<div
									class="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 text-xl font-bold text-white transition-colors hover:bg-black/60"
								>
									+{gridMedia.length - 3}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<!-- Attachment List -->
			{#if attachments.length > 0}
				<div class="mt-1 flex flex-col gap-1">
					{#each attachments as item, i}
						<a
							href={item.url}
							target="_blank"
							rel="noopener noreferrer"
							class="group flex items-center gap-3 rounded-xl border border-transparent bg-gray-100/80 p-3 transition-all hover:border-gray-300 hover:bg-gray-200/80 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-700"
						>
							<!-- Icon container -->
							<div
								class="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-500 shadow-sm transition-transform group-hover:scale-105 dark:bg-gray-700"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
							</div>

							<!-- File Info -->
							<div class="flex min-w-0 flex-col">
								<span
									class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100"
									title={item.name || item.url.split('/').pop()}
								>
									{item.name || item.url.split('/').pop()?.split('?')[0] || 'Document'}
								</span>
								<span class="text-xs font-medium text-gray-500 dark:text-gray-400">
									{(
										item.name?.split('.').pop() || item.url.split('.').pop()?.split('?')[0]
									)?.toUpperCase() || 'FILE'} · Download
								</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}

			{#if message.content}
				<!-- Handle legacy single-media content in 'content' field if media_urls is empty -->
				{#if (!message.media_urls || message.media_urls.length === 0) && (message.content_type === 'image' || message.content_type === 'IMAGE')}
					<img src={message.content} alt="" class="mb-1 max-w-xs rounded-lg" />
				{:else if (!message.media_urls || message.media_urls.length === 0) && (message.content_type === 'video' || message.content_type === 'VIDEO')}
					<!-- svelte-ignore a11y-media-has-caption -->
					<video src={message.content} controls class="mb-1 max-w-xs rounded-lg"></video>
				{:else if (!message.media_urls || message.media_urls.length === 0) && (message.content_type === 'file' || message.content_type === 'FILE')}
					<a
						href={message.content}
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center space-x-2 rounded bg-white/10 p-2 text-sm font-normal underline"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
							/></svg
						>
						<span>Download File</span>
					</a>
				{:else}
					<p class="whitespace-pre-wrap break-words text-sm font-normal">
						{@html parseContent(message.content)}
					</p>
				{/if}
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
