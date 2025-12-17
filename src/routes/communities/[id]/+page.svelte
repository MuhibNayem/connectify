<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getPosts, getCommunity, type Community } from '$lib/api';
	import PostCard from '$lib/components/feed/PostCard.svelte';
	import PostCreator from '$lib/components/feed/PostCreator.svelte';
	import type { Post } from '$lib/types';
	import Skeleton from '$lib/components/ui/skeleton/Skeleton.svelte';
	import { Info, Calendar, Globe, GlobeLock } from '@lucide/svelte';

	let id = $derived($page.params.id);
	let community = $state<Community | null>(null);
	let posts = $state<Post[]>([]);
	let loading = $state(true);
	let error = $state('');

	async function loadFeed() {
		loading = true;
		try {
			// Fetch community details (lightweight check, mostly cached ideally)
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
		loadFeed();
	});
</script>

<div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
	<!-- Left: Feed (cols-2) -->
	<div class="space-y-6 lg:col-span-2">
		{#if error}
			<div class="glass-panel border-red-500/30 bg-red-500/10 p-4 text-red-500">{error}</div>
		{/if}

		<!-- Create Post -->
		{#if community?.is_member}
			<div class="relative z-10">
				<PostCreator communityId={id} on:postCreated={handlePostCreated} />
			</div>
		{/if}

		<!-- Posts Feed -->
		{#if loading}
			<div class="space-y-4">
				{#each Array(3) as _}
					<div class="glass-card h-64 animate-pulse rounded-xl" />
				{/each}
			</div>
		{:else if posts.length > 0}
			<div class="space-y-6">
				{#each posts as post (post.id)}
					<PostCard {post} />
				{/each}
			</div>
		{:else}
			<div class="glass-panel text-muted-foreground p-12 text-center">
				<p class="text-lg">No posts yet.</p>
				<p class="text-sm">Be the first to share something with the group!</p>
			</div>
		{/if}
	</div>

	<!-- Right: Sidebar Widgets -->
	<div class="space-y-6 lg:sticky lg:top-24">
		<!-- About Card -->
		<div class="glass-card rounded-xl p-5">
			<h3 class="mb-4 flex items-center gap-2 text-lg font-bold">
				<Info size={20} class="text-primary" /> About
			</h3>
			<p class="text-muted-foreground mb-4 text-sm leading-relaxed">
				{community?.description || 'No description provided.'}
			</p>

			<div class="space-y-3 border-t border-white/10 pt-2">
				<div class="flex items-center gap-3 text-sm font-medium">
					{#if community?.privacy === 'public'}
						<Globe size={18} /> Public
					{:else}
						<GlobeLock size={18} /> Private
					{/if}
					<span class="text-muted-foreground font-normal">
						{community?.privacy === 'public'
							? "Anyone can see who's in the group and what they post."
							: "Only members can see who's in the group and what they post."}
					</span>
				</div>
				<div class="flex items-center gap-3 text-sm font-medium">
					<Calendar size={18} />
					<span
						>Created {community
							? new Date(community.created_at).toLocaleDateString(undefined, {
									year: 'numeric',
									month: 'long',
									day: 'numeric'
								})
							: '...'}</span
					>
				</div>
			</div>
		</div>

		<!-- Members Widget (Mock) -->
		<!-- Future: Add 'Recently Joined' or 'Admins' widget here -->
	</div>
</div>
