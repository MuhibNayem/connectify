<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { apiRequest } from '$lib/api';
	import { auth } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { websocketMessages } from '$lib/websocket';
	import CommentSection from './CommentSection.svelte';

	export let post: {
		id: string;
		user_id: string;
		author: {
			id: string;
			username: string;
			avatar?: string;
			full_name?: string;
		};
		content: string;
		media?: { url: string; type: string }[];
		location?: string;
		privacy: string;
		comments: any[];
		mentions: string[];
		specific_reaction_counts: { [key: string]: number };
		hashtags: string[];
		created_at: string;
		updated_at: string;
		total_reactions: number;
		total_comments: number;
	};

	export let isDetailedView = false;

	let showComments = isDetailedView;

	// Reactive user ID from the new auth store
	$: currentUserId = auth.state.user?.id;

	let userReactionId: string | null = null;
	$: isLikedByCurrentUser = userReactionId !== null;

	onMount(() => {
		(async () => {
			if (currentUserId) {
				try {
					const reactions = await apiRequest('GET', `/feed/posts/${post.id}/reactions`);
					const userReaction = reactions?.find(
						(r: any) => r.user_id === currentUserId && r.type === 'LIKE'
					);
					if (userReaction) {
						userReactionId = userReaction.id;
					} else {
						userReactionId = null; // Ensure it's null if no reaction found
					}
				} catch (e) {
					console.error('Failed to fetch reactions for post:', e);
				}
			}
		})();

		const unsubscribe = websocketMessages.subscribe((event) => {
			if (!event?.data) return;

			// Handle ReactionCreated event
			if (event.type === 'ReactionCreated' && event.data.target_id === post.id) {
				// post.specific_reaction_counts[event.data.type] =
				// 	(post.specific_reaction_counts[event.data.type] || 0) + 1;
				if (event.data.user_id != currentUserId) post.total_reactions += 1;

				// Handle special case for "LIKE" reactions by the current user
				if (event.data.user_id === currentUserId && event.data.type === 'LIKE') {
					userReactionId = event.data.id;
				}
			}

			// Handle ReactionDeleted event
			if (event.type === 'ReactionDeleted' && event.data.target_id === post.id) {
				// Decrement the reaction count when a reaction is deleted

				// post.specific_reaction_counts[event.data.type] = Math.max(
				// 	0,
				// 	(post.specific_reaction_counts[event.data.type] || 0) - 1
				// );
				if (event.data.user_id != currentUserId)
					post.total_reactions = Math.max(0, post.total_reactions - 1);

				// If the deleted reaction was by the current user and was a "LIKE", reset the reaction ID
				if (event.data.user_id === currentUserId && event.data.type === 'LIKE') {
					userReactionId = null;
				}
			}

			// Handle CommentCreated event
			if (event.type === 'CommentCreated' && event.data.post_id === post.id) {
				post.total_comments += 1;
			}

			// Handle CommentDeleted event
			if (event.type === 'CommentDeleted' && event.data.post_id === post.id) {
				post.total_comments = Math.max(0, post.total_comments - 1);
			}
		});

		return () => {
			unsubscribe();
		};
	});

	async function handleLike() {
		if (!currentUserId) {
			alert('Please log in to react.');
			return;
		}

		try {
			if (isLikedByCurrentUser) {
				await apiRequest(
					'DELETE',
					`/feed/reactions/${userReactionId}?targetId=${post.id}&targetType=post`
				);
				userReactionId = null; // Optimistic update for immediate UI feedback
				post.total_reactions -= 1;
			} else {
				const newReaction = await apiRequest('POST', '/feed/reactions', {
					target_id: post.id,
					target_type: 'post',
					type: 'LIKE'
				});
				userReactionId = newReaction.id; // Optimistic update for immediate UI feedback
				post.total_reactions += 1;
			}
		} catch (e: any) {
			alert(`Failed to toggle like: ${e.message}`);
			console.error('Toggle like error:', e);
		}
	}
	function handleComment() {
		showComments = !showComments;
	}

	function handleShare() {
		alert(`Sharing post by ${post?.author?.username}`);
	}
	import { goto } from '$app/navigation';

	function handleNavigate() {
		if (!isDetailedView) {
			goto(`/posts/${post.id}`);
		}
	}
</script>

<div class="mx-auto w-full max-w-2xl space-y-3 rounded-lg bg-white p-4 shadow-md">
	<!-- Post Header -->
	<div class="flex items-center space-x-3">
		<Avatar class="h-10 w-10">
			<AvatarImage
				src={post.author.avatar || 'https://github.com/shadcn.png'}
				alt={post?.author?.username}
			/>
			<AvatarFallback>{post.author?.username?.charAt(0).toUpperCase()}</AvatarFallback>
		</Avatar>
		<div>
			<div class="flex items-center space-x-1">
				<p class="font-semibold text-gray-900 dark:text-white">
					{post.author.username}
					<!-- Use username for now as Full Name might not be populated or same -->
				</p>
				{#if post.mentions && post.mentions.length > 0}
					<span class="font-normal text-gray-500 dark:text-gray-400">with</span>
					<span class="font-medium text-gray-900 dark:text-white">
						{post.mentions.length} people
					</span>
				{/if}
				{#if post.location}
					<span class="font-normal text-gray-500 dark:text-gray-400">is at</span>
					<span class="font-medium text-gray-900 dark:text-white">{post.location}</span>
				{/if}
			</div>
			<p class="text-xs text-gray-500">
				{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })} •
				<span class="capitalize">{post.privacy.replace('_', ' ').toLowerCase()}</span>
			</p>
		</div>
	</div>

	<!-- Post Content -->
	<div class="leading-relaxed text-gray-800">
		{#if !isDetailedView && post.content.length > 200}
			<p>
				{post.content.slice(0, 200)}...
				<button class="font-semibold text-blue-600 hover:underline" onclick={handleNavigate}>
					See more
				</button>
			</p>
		{:else}
			<p>{post.content}</p>
		{/if}
	</div>

	<!-- Media Grid -->
	{#if post.media && post.media.length > 0}
		{#if isDetailedView}
			<!-- Detailed View: Show ALL media in a vertical list or large grid -->
			<div class="mt-3 space-y-4">
				{#each post.media as item}
					<div class="w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900">
						{#if item.type === 'image' || item.type?.startsWith('image')}
							<img src={item.url} alt="Post media" class="w-full object-contain" />
						{:else if item.type === 'video' || item.type?.startsWith('video')}
							<video src={item.url} controls class="w-full"></video>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<!-- Feed View: Grid with Overflow -->
			{@const mediaCount = post.media.length}
			{@const displayMedia = post.media.slice(0, 4)}
			<!-- Show max 4 items -->
			{@const remainingCount = mediaCount > 4 ? mediaCount - 3 : 0}
			<!-- If >4, we show 3 and the 4th has the overlay -->

			<div
				class={`mt-3 grid gap-1 overflow-hidden rounded-xl ${
					mediaCount === 1
						? 'h-[300px] grid-cols-1'
						: mediaCount === 2
							? 'h-[250px] grid-cols-2'
							: mediaCount === 3
								? 'h-[400px] grid-rows-2'
								: 'h-[400px] grid-cols-2 grid-rows-2' // 4 or more
				}`}
			>
				{#each displayMedia as item, i}
					{@const isLastItem = i === 3}
					{@const isOverlayNeeded = mediaCount > 4 && isLastItem}

					<!-- Grid Spanning Logic -->
					<!-- 3 items: First item takes full width of first row (col-span-2) -->
					<div
						class={`relative cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-900 ${
							mediaCount === 3 && i === 0 ? 'col-span-2 row-span-1' : ''
						} ${
							/* Image/Video sizing */
							'h-full w-full'
						}`}
						onclick={handleNavigate}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && handleNavigate()}
					>
						{#if item.type === 'image' || item.type?.startsWith('image')}
							<img
								src={item.url}
								alt="Post media"
								class="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
							/>
						{:else if item.type === 'video' || item.type?.startsWith('video')}
							<video src={item.url} controls class="h-full w-full object-cover"></video>
						{/if}

						<!-- Overflow Overlay -->
						{#if isOverlayNeeded}
							<div
								class="absolute inset-0 flex items-center justify-center bg-black/60 transition-colors hover:bg-black/70"
							>
								<span class="text-3xl font-bold text-white">+{mediaCount - 3}</span>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- Post Actions (Likes, Comments Count) -->
	<div
		class="flex items-center justify-between border-b border-gray-200 pb-2 text-sm text-gray-600"
	>
		<span>{post.total_reactions || 0} Likes</span>
		<span>{post.total_comments || 0} Comments</span>
	</div>

	<!-- Action Buttons (Like, Comment, Share) -->
	<div class="flex justify-around pt-2">
		<Button
			variant="ghost"
			class="flex items-center space-x-1 {isLikedByCurrentUser
				? 'text-blue-600'
				: 'text-gray-600'} hover:text-blue-600"
			onclick={handleLike}
		>
			<span class="text-xl">👍</span>
			<span>{isLikedByCurrentUser ? 'Liked' : 'Like'}</span>
		</Button>
		<Button
			variant="ghost"
			class="flex items-center space-x-1 text-gray-600 hover:text-indigo-600"
			onclick={handleComment}
		>
			<span class="text-xl">💬</span>
			<span>Comment</span>
		</Button>
		<Button
			variant="ghost"
			class="flex items-center space-x-1 text-gray-600 hover:text-indigo-600"
			onclick={handleShare}
		>
			<span class="text-xl">🔗</span>
			<span>Share</span>
		</Button>
	</div>

	{#if showComments}
		<CommentSection postId={post.id} />
	{/if}
</div>
