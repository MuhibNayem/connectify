<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth.svelte';
	import { getPosts, type Community } from '$lib/api';
	import { getCommunity } from '$lib/api';
	import PostCard from '$lib/components/feed/PostCard.svelte';
	import PostCreator from '$lib/components/feed/PostCreator.svelte';
	import type { Post } from '$lib/types';

	let id = $page.params.id;
	let community: Community | null = null;
	let posts: Post[] = [];
	let loading = true;
	let error = '';

	async function loadCommunityAndFeed() {
		loading = true;
		try {
			// Fetch community details to check membership/privacy
			// (Layout also fetches it, but we might need it here for conditional rendering logic
			// if not passed via context/stores. For now, fetching again is safer/simpler)
			community = await getCommunity(id);

			// Fetch posts
			const res = await getPosts({ community_id: id, page: 1, limit: 20 });
			posts = res.posts || [];
		} catch (e: any) {
			console.error('Failed to load feed:', e);
			error = e.message;
		} finally {
			loading = false;
		}
	}

	function handlePostCreated(event: CustomEvent<Post>) {
		posts = [event.detail, ...posts];
	}

	onMount(() => {
		loadCommunityAndFeed();
	});
</script>

<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
	<!-- Main Feed -->
	<div class="space-y-6 lg:col-span-2">
		{#if error}
			<div class="rounded-xl bg-red-50 p-4 text-red-600">{error}</div>
		{/if}

		<!-- Create Post Widget (Only if member) -->
		{#if community?.is_member}
			<PostCreator communityId={id} on:postCreated={handlePostCreated} />
		{/if}

		<!-- Posts Feed -->
		{#if loading}
			<div class="space-y-4">
				{#each Array(3) as _}
					<div class="h-64 animate-pulse rounded-xl bg-white dark:bg-gray-800" />
				{/each}
			</div>
		{:else if posts.length > 0}
			<div class="space-y-6">
				{#each posts as post (post.id)}
					<PostCard {post} />
				{/each}
			</div>
		{:else}
			<div class="py-12 text-center text-gray-500">
				<p>No posts yet. Be the first to share something!</p>
			</div>
		{/if}
	</div>

	<!-- Sidebar -->
	<div class="space-y-6">
		<!-- About Card -->
		<div
			class="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700/50 dark:bg-gray-800"
		>
			<h3 class="mb-4 font-bold text-gray-900 dark:text-white">About</h3>
			<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
				{community?.description || 'Loading...'}
			</p>
			<div class="space-y-3">
				<div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
					<span class="w-5 text-center">🌍</span>
					<span class="capitalize">{community?.privacy || 'Public'}</span>
				</div>
				<div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
					<span class="w-5 text-center">📅</span>
					Created {community ? new Date(community.created_at).toLocaleDateString() : ''}
				</div>
			</div>
		</div>
	</div>
</div>
