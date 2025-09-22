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
		media_type?: string;
		media_url?: string;
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

	let showComments = false;

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
				post.total_reactions += 1;

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
</script>

<div class="space-y-3 rounded-lg bg-white p-4 shadow-md">
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
			<p class="font-semibold text-gray-900">{post.author.full_name || post.author.username}</p>
			<p class="text-xs text-gray-500">
				{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
			</p>
		</div>
	</div>

	<!-- Post Content -->
	<p class="leading-relaxed text-gray-800">{post.content}</p>

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
