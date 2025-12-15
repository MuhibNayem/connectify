<!--
Component to display a single message bubble.
It styles messages differently based on whether they were sent by the current user.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { lightbox } from '$lib/stores/lightbox.svelte';
	import type { Message } from '$lib/types';
	import MessageActions from './MessageActions.svelte';
	import MessageReactions from './MessageReactions.svelte';

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
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
</script>

<div
	class="my-2 flex items-start gap-2.5"
	class:flex-row-reverse={isMe}
	in:fly={{ y: 20, duration: 400, easing: quintOut }}
>
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
				{#if message.id.startsWith('temp-')}
					<!-- Sending (Hollow circle) -->
					<div class="h-4 w-4 rounded-full border-2 border-gray-400"></div>
				{:else}
					{@const otherSeenCount =
						message.seen_by?.filter((id) => id !== auth.state.user?.id).length || 0}
					{@const otherDeliveredCount =
						message.delivered_to?.filter((id) => id !== auth.state.user?.id).length || 0}

					{#if otherSeenCount > 0}
						<!-- Seen (Blue filled check or Avatar) -->
						<!-- FB style is avatar, but we'll use filled blue check for clarity across group/dm for now -->
						<svg class="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
							/>
						</svg>
					{:else if otherDeliveredCount > 0}
						<!-- Delivered (Grey filled check) -->
						<svg class="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
							/>
						</svg>
					{:else}
						<!-- Sent (Hollow circle with check) -->
						<svg
							class="h-4 w-4 text-gray-400"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<circle cx="12" cy="12" r="10" />
							<path stroke-linecap="round" stroke-linejoin="round" d="M8 12l2 2 4-4" />
						</svg>
					{/if}
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
							class="relative aspect-square w-full cursor-pointer
							{gridMedia.length === 3 && i === 0 ? 'col-span-2 aspect-[2/1]' : ''}
							"
							on:click={() => lightbox.open(gridMedia as any, i)}
							role="button"
							tabindex="0"
							on:keypress={(e) => e.key === 'Enter' && lightbox.open(gridMedia as any, i)}
						>
							{#if item.type === 'video'}
								<!-- svelte-ignore a11y-media-has-caption -->
								<video
									src={item.url}
									class="pointer-events-none h-full w-full bg-black object-cover"
								></video>
								<div
									class="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/20"
								>
									<div class="rounded-full bg-black/50 p-3 text-white backdrop-blur-sm">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-8 w-8"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</div>
								</div>
							{:else}
								<img
									src={item.url}
									alt="Attachment"
									class="h-full w-full bg-gray-100 object-cover transition-opacity hover:opacity-90"
									on:error={handleImgError}
								/>
							{/if}

							<!-- Overlay for +X items -->
							{#if gridMedia.length > 4 && i === 3}
								<div
									class="absolute inset-0 flex items-center justify-center bg-black/50 text-xl font-bold text-white transition-colors hover:bg-black/60"
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
		<div class="mt-1 flex items-center justify-between gap-2">
			<div class="flex items-center gap-2" class:flex-row-reverse={isMe}>
				{#if message.is_edited}
					<span class="text-xs font-normal text-gray-400">Edited</span>
				{/if}

				<!-- Display reactions using the new component -->
				<MessageReactions reactions={message.reactions || []} messageId={message.id} />
			</div>

			<!-- Message Actions (Edit/Delete/React) -->
			<MessageActions
				messageId={message.id}
				messageContent={message.content || ''}
				messageSenderId={message.sender_id}
				messageCreatedAt={message.created_at}
				onEdited={(newContent) => (message.content = newContent)}
				on:deleted={() => dispatch('deleted', { id: message.id })}
			/>
		</div>
	</div>
</div>
