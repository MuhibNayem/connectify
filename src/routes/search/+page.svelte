<script lang="ts">
    import { page } from '$app/stores';
    import { apiRequest } from '$lib/api';
    import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
    import { Avatar, AvatarFallback, AvatarImage } from "$lib/components/ui/avatar"
    import { Button } from '$lib/components/ui/button';
    import { goto } from '$app/navigation';

    let searchQuery: string = '';
    let searchResults: { users: any[]; posts: any[]; total: number } | null = null;
    let loading: boolean = false;
    let error: string | null = null;

    $: {
        // React to changes in the URL's search parameter
        const newQuery = $page.url.searchParams.get('query') || '';
        if (newQuery !== searchQuery) {
            searchQuery = newQuery;
            if (searchQuery) {
                fetchSearchResults(searchQuery);
            } else {
                searchResults = null;
            }
        }
    }

    async function fetchSearchResults(query: string) {
        loading = true;
        error = null;
        try {
            const response = await apiRequest('GET', `/search?query=${encodeURIComponent(query)}`);
            searchResults = response;
            console.log('Search results:', searchResults);
        } catch (err: any) {
            error = err.message || 'Failed to fetch search results.';
            console.error('Search error:', err);
        } finally {
            loading = false;
        }
    }

    function navigateToUser(userId: string) {
        goto(`/profile/${userId}`); // Assuming a profile page exists
    }

    function navigateToPost(postId: string) {
        goto(`/post/${postId}`); // Assuming a post detail page exists
    }
</script>

<div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold mb-6">Search Results for "{searchQuery}"</h1>

    {#if loading}
        <p>Loading search results...</p>
    {:else if error}
        <p class="text-red-500">Error: {error}</p>
    {:else if searchResults && searchResults.total === 0}
        <p>No results found for "{searchQuery}".</p>
    {:else if searchResults}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Users Section -->
            <Card>
                <CardHeader>
                    <CardTitle>Users ({searchResults?.users?.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {#if searchResults?.users?.length > 0}
                        <div class="space-y-4">
                            {#each searchResults.users as user}
                                <div class="flex items-center space-x-4 p-2 border rounded-md">
                                    <Avatar>
                                        <AvatarImage src={user.avatar || 'https://github.com/shadcn.png'} alt={user.username} />
                                        <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div class="flex-grow">
                                        <p class="font-semibold">{user.username}</p>
                                        <p class="text-sm text-gray-500">{user.full_name || 'No full name'}</p>
                                    </div>
                                    <Button variant="outline" onclick={() => navigateToUser(user.id)}>View Profile</Button>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <p>No users found.</p>
                    {/if}
                </CardContent>
            </Card>

            <!-- Posts Section -->
            <Card>
                <CardHeader>
                    <CardTitle>Posts ({searchResults?.posts?.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {#if searchResults?.posts?.length > 0}
                        <div class="space-y-4">
                            {#each searchResults.posts as post}
                                <div class="p-2 border rounded-md">
                                    <p class="font-semibold mb-1">{post.content.substring(0, 100)}{post.content.length > 100 ? '...' : ''}</p>
                                    <p class="text-sm text-gray-500">by User ID: {post.user_id}</p>
                                    <Button variant="link" onclick={() => navigateToPost(post.id)}>Read More</Button>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <p>No posts found.</p>
                    {/if}
                </CardContent>
            </Card>
        </div>
    {/if}
</div>
