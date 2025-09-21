<script lang="ts">
    import { onMount } from 'svelte';
    import AppHeader from '$lib/components/layout/AppHeader.svelte';
    import LeftSidebar from '$lib/components/layout/LeftSidebar.svelte';
    import RightSidebar from '$lib/components/layout/RightSidebar.svelte';
    import PostCreator from '$lib/components/feed/PostCreator.svelte';
    import PostCard from '$lib/components/feed/PostCard.svelte';
    import { apiRequest } from '$lib/api';
    import { intersect } from '$lib/actions/intersect';
    import { websocketMessages } from '$lib/websocket';

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
            const response = await apiRequest('GET', `/feed/posts?page=${page}&limit=10`);
            if (response.posts && response.posts.length > 0) {
                posts = page === 1 ? response.posts : [...posts, ...response.posts];
                currentPage = page;
            } else {
                hasMore = false;
            }
        } catch (err: any) {
            errorPosts = err.message || 'Failed to load posts.';
            console.error('Fetch posts error:', err);
        }
     finally {
            loadingPosts = false;
        }
    }

    function handlePostCreated(event: CustomEvent) {
        const newPost = event.detail;
        // Add new post to the top of the list if it's not already there
        if (!posts.some(p => p.id === newPost.id)) {
            posts = [newPost, ...posts];
        }
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
            }
        });

        return () => {
            unsubscribe();
        };
    });
</script>

<div class="flex min-h-screen flex-col bg-gray-100 font-sans">
	<AppHeader />

	<div class="flex flex-1 pt-14">
		<!-- pt-14 to account for fixed header height -->
		<!-- Left Sidebar -->
		<aside
			class="fixed top-14 left-0 hidden h-[calc(100vh-56px)] w-64 overflow-y-auto bg-white p-4 shadow-md md:block lg:w-72"
		>
			<LeftSidebar />
		</aside>

		<!-- Main Content Area (News Feed) -->
		<main class="flex-1 overflow-y-auto p-4 md:ml-64 lg:ml-72">
			<div class="mx-auto max-w-2xl space-y-6">
				<PostCreator on:postCreated={handlePostCreated} />
				{#if posts.length > 0}
					{#each posts as post (post.id)}
						<PostCard {post} />
					{/each}
				{/if}

				{#if hasMore && !loadingPosts}
					<div use:intersect on:intersect={loadMorePosts} class="h-10"></div>
				{/if}

				{#if loadingPosts}
					<p>Loading posts...</p>
				{/if}

				{#if !hasMore && posts.length > 0}
					<p class="text-center text-gray-500">You've reached the end!</p>
				{/if}

				{#if !loadingPosts && posts.length === 0 && !errorPosts}
					<p>No posts to display. Be the first to post!</p>
				{/if}

				{#if errorPosts}
					<p class="text-red-500">Error: {errorPosts}</p>
				{/if}
			</div>
		</main>

		<!-- Right Sidebar -->
		<aside
			class="fixed top-14 right-0 hidden h-[calc(100vh-56px)] w-72 overflow-y-auto bg-white p-4 shadow-md lg:block"
		>
			<RightSidebar />
		</aside>
	</div>
</div>
