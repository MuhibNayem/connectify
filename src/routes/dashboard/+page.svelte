<script lang="ts">
	import { onMount } from 'svelte';
	// AppHeader is now in +layout.svelte
	import LeftSidebar from '$lib/components/layout/LeftSidebar.svelte';
	import RightSidebar from '$lib/components/layout/RightSidebar.svelte';
	import PostCreator from '$lib/components/feed/PostCreator.svelte';
	import PostCard from '$lib/components/feed/PostCard.svelte';
	import { apiRequest } from '$lib/api';
	import { intersect } from '$lib/actions/intersect';
	import { websocketMessages } from '$lib/websocket';
	import Skeleton from '$lib/components/ui/skeleton.svelte';

	let posts: any[] = [];
	let loadingPosts: boolean = true;
	let errorPosts: string | null = null;
	let currentPage = 1;
	let hasMore = true;

	async function fetchPosts(page = 1) {
		if (!hasMore && page > 1) return;
		loadingPosts = true;
		errorPosts = null;
		try {
			const response = await apiRequest('GET', `/posts?page=${page}&limit=10`);
			if (response.posts && response.posts.length > 0) {
				posts = page === 1 ? response.posts : [...posts, ...response.posts];
				currentPage = page;
			} else {
				hasMore = false;
			}
		} catch (err: any) {
			errorPosts = err.message || 'Failed to load posts.';
			console.error('Fetch posts error:', err);
		} finally {
			loadingPosts = false;
		}
	}

	function handlePostCreated(event: CustomEvent) {
		const newPost = event.detail;
		// Add new post to the top of the list if it's not already there
		if (!posts.some((p) => p.id === newPost.id)) {
			posts = [newPost, ...posts];
		}
	}

	function handlePostUpdated(event: CustomEvent) {
		const updatedPost = event.detail;
		posts = posts.map((p) => (p.id === updatedPost.id ? updatedPost : p));
	}

	function handlePostDeleted(event: CustomEvent) {
		const deletedPost = event.detail;
		posts = posts.filter((p) => p.id !== deletedPost.id);
	}

	function loadMorePosts() {
		if (loadingPosts || !hasMore) return;
		fetchPosts(currentPage + 1);
	}

	onMount(() => {
		fetchPosts(1);

		const unsubscribe = websocketMessages.subscribe((event) => {
			if (event && event.type === 'PostCreated') {
				handlePostCreated({ detail: event.data } as CustomEvent);
			} else if (event && event.type === 'PostUpdated') {
				handlePostUpdated({ detail: event.data } as CustomEvent);
			} else if (event && event.type === 'PostDeleted') {
				handlePostDeleted({ detail: event.data } as CustomEvent);
			}
		});

		return () => {
			unsubscribe();
		};
	});
</script>

<div class="flex min-h-screen flex-col font-sans">
	<div class="grid flex-1 grid-cols-[auto_1fr_auto] pt-14">
		<!-- pt-14 to account for fixed header height -->
		<!-- Left Sidebar -->
		<aside
			class="sticky top-14 hidden h-[calc(100vh-56px)] w-64 overflow-y-auto p-4 md:block lg:w-72"
		>
			<LeftSidebar />
		</aside>

		<!-- Main Content Area (News Feed) -->
		<main class="overflow-y-auto p-4">
			<div class="mx-auto flex max-w-2xl flex-col items-center space-y-6">
				<!-- Post Creator with high z-index to prevent dropdown clipping -->
				<div class="relative z-30 mb-6 w-full">
					<PostCreator on:postCreated={handlePostCreated} />
				</div>

				{#if loadingPosts && posts.length === 0}
					<div class="w-full space-y-6">
						{#each Array(3) as _, i (i)}
							<div class="glass-card mx-auto w-full max-w-2xl space-y-3 p-4">
								<div class="flex items-center space-x-3">
									<Skeleton class="h-10 w-10 rounded-full" />
									<div class="space-y-2">
										<Skeleton class="h-4 w-[200px]" />
										<Skeleton class="h-4 w-[150px]" />
									</div>
								</div>
								<div class="space-y-2">
									<Skeleton class="h-4 w-full" />
									<Skeleton class="h-4 w-[80%]" />
								</div>
								<div class="flex items-center justify-between pt-2">
									<Skeleton class="h-8 w-24" />
									<Skeleton class="h-8 w-24" />
								</div>
							</div>
						{/each}
					</div>
				{:else if !loadingPosts && posts.length === 0 && !errorPosts}
					<p class="glass-panel w-full rounded-lg p-4 text-center">
						No posts to display. Be the first to post!
					</p>
				{:else}
					<div class="w-full space-y-6">
						{#each posts as post (post.id)}
							<PostCard {post} />
						{/each}
					</div>
				{/if}

				{#if hasMore && !loadingPosts}
					<div use:intersect on:intersect={loadMorePosts} class="h-10 w-full"></div>
				{/if}

				{#if loadingPosts && posts.length > 0}
					<div class="flex justify-center p-4">
						<div
							class="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
						></div>
					</div>
				{/if}

				{#if !hasMore && posts.length > 0}
					<p class="text-muted-foreground text-center">You've reached the end!</p>
				{/if}

				{#if errorPosts}
					<p class="text-red-500">Error: {errorPosts}</p>
				{/if}
			</div>
		</main>

		<!-- Right Sidebar -->
		<aside class="sticky top-14 hidden h-[calc(100vh-56px)] w-72 overflow-y-auto p-4 lg:block">
			<RightSidebar />
		</aside>
	</div>
</div>
