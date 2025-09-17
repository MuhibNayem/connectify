<script lang="ts">
    import { onMount } from 'svelte';
    import AppHeader from '$lib/components/layout/AppHeader.svelte';
    import LeftSidebar from '$lib/components/layout/LeftSidebar.svelte';
    import RightSidebar from '$lib/components/layout/RightSidebar.svelte';
    import PostCreator from '$lib/components/feed/PostCreator.svelte';
    import PostCard from '$lib/components/feed/PostCard.svelte';
    import { apiRequest } from '$lib/api'; // Import apiRequest

    let posts: any[] = [];
    let loadingPosts: boolean = true;
    let errorPosts: string | null = null;

    onMount(async () => {
        await fetchPosts();
    });

    async function fetchPosts() {
        loadingPosts = true;
        errorPosts = null;
        try {
            const response = await apiRequest('GET', '/feed/posts');
            posts = response.posts || [];
        } catch (err: any) {
            errorPosts = err.message || 'Failed to load posts.';
            console.error('Fetch posts error:', err);
        } finally {
            loadingPosts = false;
        }
    }
    $:{
        console.log('Posts updated:', posts);
        console.log('Loading state:', loadingPosts);
        console.log('Error state:', errorPosts);
    }
    function handlePostCreated(event: CustomEvent) {
        const newPost = event.detail;
        posts = [newPost, ...posts]; // Add new post to the top of the list
    }
</script>

<div class="flex flex-col min-h-screen bg-gray-100 font-sans">
    <AppHeader />

    <div class="flex flex-1 pt-14"> <!-- pt-14 to account for fixed header height -->
        <!-- Left Sidebar -->
        <aside class="hidden md:block w-64 lg:w-72 bg-white p-4 shadow-md overflow-y-auto fixed h-[calc(100vh-56px)] top-14 left-0">
            <LeftSidebar />
        </aside>

        <!-- Main Content Area (News Feed) -->
        <main class="flex-1 p-4 md:ml-64 lg:ml-72 overflow-y-auto">
            <div class="max-w-2xl mx-auto space-y-6">
                <PostCreator on:postCreated={handlePostCreated} />
                {#if loadingPosts}
                    <p>Loading posts...</p>
                {:else if errorPosts}
                    <p class="text-red-500">Error: {errorPosts}</p>
                {:else if posts.length === 0}
                    <p>No posts to display. Be the first to post!</p>
                {:else}
                    {#each posts as post (post.id)}
                        <PostCard {post} />
                    {/each}
                {/if}
            </div>
        </main>

        <!-- Right Sidebar -->
        <aside class="hidden lg:block w-72 bg-white p-4 shadow-md overflow-y-auto fixed h-[calc(100vh-56px)] top-14 right-0">
            <RightSidebar />
        </aside>
    </div>
</div>

<style lang="postcss">
    /* Add any specific styles here if needed */
</style>
