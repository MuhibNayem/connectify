<script lang="ts">
    import { page } from '$app/stores';
    import { apiRequest } from '$lib/api';
    import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
    import { Card, CardContent } from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
    import PostCard from '$lib/components/feed/PostCard.svelte'; // Assuming this component exists

    let userId: string;
    let user: any | null = null;
    let posts: any[] = [];
    let loadingUser: boolean = true;
    let loadingPosts: boolean = true;
    let userError: string | null = null;
    let postsError: string | null = null;
    let friendshipStatus: 'none' | 'pending' | 'friends' | 'blocked' = 'none'; // 'none', 'pending', 'friends', 'blocked'
    let sendingRequest: boolean = false;

    async function sendFriendRequest() {
        sendingRequest = true;
        try {
            await apiRequest('POST', '/friendships/requests', { receiver_id: userId });
            friendshipStatus = 'pending';
            // Optionally, show a success toast
        } catch (err: any) {
            console.error('Failed to send friend request:', err);
            // Optionally, show an error toast
        } finally {
            sendingRequest = false;
        }
    }

    $: {
        userId = $page.params.id ?? "";
        if (userId) {
            fetchUserProfile(userId);
            fetchUserPosts(userId);
        }
    }

    async function fetchUserProfile(id: string) {
        loadingUser = true;
        userError = null;
        try {
            user = await apiRequest('GET', `/users/${id}`);
            // Check friendship status with the viewed user
            try {
                const friendshipCheck = await apiRequest('GET', `/friendships/check?other_user_id=${id}`);
                if (friendshipCheck.are_friends) {
                    friendshipStatus = 'friends';
                } else if (friendshipCheck.RequestSent) { // Corrected: Backend returns RequestSent (uppercase R)
                    friendshipStatus = 'pending';
                } else if (friendshipCheck.IsBlockedByViewer || friendshipCheck.HasBlockedViewer) { // Check if either party blocked
                    friendshipStatus = 'blocked';
                } else if (friendshipCheck.RequestReceived) { // If a request is received, it's also not 'none'
                    friendshipStatus = 'pending'; // Or a different status like 'respond_to_request'
                
                } else {
                    friendshipStatus = 'none';
                }
            } catch (err: any) {
                console.warn('Could not check friendship status (might not be logged in or API issue):', err);
                friendshipStatus = 'none'; // Default to none if check fails
            }
        } catch (err: any) {
            userError = err.message || 'Failed to fetch user profile.';
            console.error('User profile fetch error:', err);
        } finally {
            loadingUser = false;
        }
    }

    async function fetchUserPosts(id: string) {
        loadingPosts = true;
        postsError = null;
        try {
            // NOTE: The current API docs do not show a direct endpoint to get posts by user ID.
            // Assuming /api/feed/posts can be filtered by user_id or a new endpoint is needed.
            // For now, I'll simulate fetching all posts and filtering client-side,
            // or assume the backend will be updated to support a query parameter like ?user_id=
            const response = await apiRequest('GET', `/feed/posts?user_id=${id}`); // Assuming backend supports user_id filter
            posts = response.posts || [];
        } catch (err: any) {
            postsError = err.message || 'Failed to fetch user posts.';
            console.error('User posts fetch error:', err);
        } finally {
            loadingPosts = false;
        }
    }
</script>

<div class="container mx-auto p-4">
    {#if loadingUser}
        <p>Loading user profile...</p>
    {:else if userError}
        <p class="text-red-500">Error: {userError}</p>
    {:else if user}
        <Card class="mb-6">
            <CardContent class="flex flex-col md:flex-row items-center p-6">
                <Avatar class="h-24 w-24 md:h-32 md:w-32 mb-4 md:mb-0 md:mr-6">
                    <AvatarImage src={user.avatar || 'https://github.com/shadcn.png'} alt={user.username} />
                    <AvatarFallback class="text-4xl">{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div class="text-center md:text-left flex-grow">
                    <h1 class="text-3xl font-bold">{user.full_name || user.username}</h1>
                    {#if user.full_name}<p class="text-lg text-gray-600">@{user.username}</p>{/if}
                    {#if user.bio}<p class="mt-2 text-gray-700">{user.bio}</p>{/if}
                    <div class="mt-4 flex justify-center md:justify-start space-x-4">
                        {#if friendshipStatus === 'none'}
                            <Button variant="outline" onclick={sendFriendRequest} disabled={sendingRequest}>
                                {sendingRequest ? 'Sending...' : 'Add Friend'}
                            </Button>
                        {:else if friendshipStatus === 'pending'}
                            <Button variant="outline" disabled>Friend Request Sent</Button>
                        {:else if friendshipStatus === 'friends'}
                            <Button variant="outline" disabled>Friends</Button>
                        {:else if friendshipStatus === 'blocked'}
                            <Button variant="destructive" disabled>Blocked</Button>
                        {/if}
                        <Button>Message</Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Tabs value="posts" class="w-full">
            <TabsList class="grid w-full grid-cols-2">
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="friends">Friends</TabsTrigger>
            </TabsList>
            <TabsContent value="posts" class="mt-4">
                <h2 class="text-2xl font-bold mb-4">Posts by {user.username}</h2>
                {#if loadingPosts}
                    <p>Loading posts...</p>
                {:else if postsError}
                    <p class="text-red-500">Error: {postsError}</p>
                {:else if posts.length === 0}
                    <p>No posts found for {user.username}.</p>
                {:else}
                    <div class="space-y-4">
                        {#each posts as post (post.id)}
                            <PostCard {post} />
                        {/each}
                    </div>
                {/if}
            </TabsContent>
            <TabsContent value="friends" class="mt-4">
                <h2 class="text-2xl font-bold mb-4">Friends of {user.username}</h2>
                <p>Friends list coming soon...</p>
                <!-- You would fetch and display friends here -->
            </TabsContent>
        </Tabs>
    {:else}
        <p>User not found.</p>
    {/if}
</div>
