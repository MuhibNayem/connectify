<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';

	import { apiRequest, currentUser } from '$lib/api';
	import { onMount } from 'svelte';

	import { websocketMessages } from '$lib/websocket';

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
		reaction_counts: { [key: string]: number };
		hashtags: string[];
		created_at: string;
		updated_at: string;
	};

	let currentUserId: string | null = null;
	currentUser.subscribe((user) => {
		if (user) {
			currentUserId = user.id;
		}
	})();

	let userReactionId: string | null = null;
	$: isLikedByCurrentUser = userReactionId !== null;

	onMount(() => {
		let unsubscribe: (() => void) | null = null;

		(async () => {
			if (currentUserId) {
				try {
					const reactions = await apiRequest('GET', `/feed/posts/${post.id}/reactions`);
					console.log('reactions for post:', reactions);
					if (!reactions || reactions.length === 0) {
						userReactionId = null;
						post = {
							...post,
							reaction_counts: {
								...post.reaction_counts,
								LIKE: post.reaction_counts ? post.reaction_counts['LIKE'] || 0 : 0
							}
						};
						return;
					}
					const userReaction = reactions.find(
						(r: any) => r.user_id === currentUserId && r.type === 'LIKE'
					);
					if (userReaction) {
						userReactionId = userReaction.id;
					}
				} catch (e) {
					console.error('Failed to fetch reactions for post:', e);
				}
			}
		})();

		unsubscribe = websocketMessages.subscribe((event) => {
			if (event && event.type === 'ReactionCreated' && event?.data?.target_id === post.id) {
				if (event.data.user_id != currentUserId) {
					post.reaction_counts['LIKE'] = (post.reaction_counts['LIKE'] || 0) + 1;
				}
				if (event?.data?.user_id === currentUserId && event?.data?.type === 'LIKE') {
					userReactionId = event.data.id;
				}
			} else if (event && event.type === 'ReactionDeleted' && event.data.target_id === post.id) {
				if (event.data.user_id != currentUserId) {
					post.reaction_counts['LIKE'] = (post.reaction_counts['LIKE'] || 1) - 1;
				}
				if (event.data.user_id === currentUserId && event.data.type === 'LIKE') {
					userReactionId = null;
				}
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
				userReactionId = null;
				post.reaction_counts['LIKE'] = (post.reaction_counts['LIKE'] || 1) - 1;
			} else {
				const newReaction = await apiRequest('POST', '/feed/reactions', {
					target_id: post.id,
					target_type: 'post',
					type: 'LIKE'
				});
				userReactionId = newReaction.id;
				post.reaction_counts['LIKE'] =
					(post.reaction_counts ? post.reaction_counts['LIKE'] : 0) + 1;
			}
		} catch (e: any) {
			alert(`Failed to toggle like: ${e.message}`);
			console.error('Toggle like error:', e);
		}
	}

	function handleComment() {
		alert(`Commenting on post by ${post?.author?.username}`);
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
			<p class="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</p>
		</div>
	</div>

	<!-- Post Content -->
	<p class="leading-relaxed text-gray-800">{post.content}</p>

	<!-- Post Actions (Likes, Comments Count) -->
	<div
		class="flex items-center justify-between border-b border-gray-200 pb-2 text-sm text-gray-600"
	>
		<span>{post?.reaction_counts ? post?.reaction_counts['LIKE'] : 0} Likes</span>
		<span>{post?.comments?.length} Comments</span>
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
			<!-- <ThumbsUp size={20} /> -->
			<span class="text-xl">👍</span>
			<span>{isLikedByCurrentUser ? 'Liked' : 'Like'}</span>
		</Button>
		<Button
			variant="ghost"
			class="flex items-center space-x-1 text-gray-600 hover:text-indigo-600"
			onclick={handleComment}
		>
			<!-- <MessageCircle size={20} /> -->
			<span class="text-xl">💬</span>
			<span>Comment</span>
		</Button>
		<Button
			variant="ghost"
			class="flex items-center space-x-1 text-gray-600 hover:text-indigo-600"
			onclick={handleShare}
		>
			<!-- <Share2 size={20} /> -->
			<span class="text-xl">🔗</span>
			<span>Share</span>
		</Button>
	</div>
</div>
