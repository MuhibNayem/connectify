<script lang="ts">
    import { apiRequest } from '$lib/api';
    import { auth } from '$lib/stores/auth.svelte';
    import { onMount } from 'svelte';
    import { Button } from '$lib/components/ui/button';
    import { presenceStore } from '$lib/stores/presence';

    interface FriendUser {
        id: string;
        username: string;
        avatar?: string;
    }

    interface Friendship {
        id: string;
        requester_id: string;
        receiver_id: string;
        status: 'pending' | 'accepted' | 'rejected';
    }

    let friends: FriendUser[] = [];
    let loading = true;
    let error: string | null = null;

    $: currentUserId = auth.state.user?.id;

    onMount(async () => {
        if (!currentUserId) {
            error = "User not authenticated.";
            loading = false;
            return;
        }
        await fetchFriends();
    });

    async function fetchFriends() {
        loading = true;
        error = null;
        try {
            const response = await apiRequest('GET', '/friendships?status=accepted', undefined, true);
            const acceptedFriendships: Friendship[] = response.data;

            const friendUserPromises = (acceptedFriendships ?? []).map(async (friendship) => {
                const friendId = friendship.requester_id === currentUserId ? friendship.receiver_id : friendship.requester_id;
                const friendDetails = await apiRequest('GET', `/users/${friendId}`, undefined, true);
                return {
                    id: friendDetails.id,
                    username: friendDetails.username,
                    avatar: friendDetails.avatar,
                };
            });

            friends = await Promise.all(friendUserPromises);

        } catch (e: any) {
            error = e.message || 'Failed to load friend list.';
            console.error(e);
        } finally {
            loading = false;
        }
    }

    async function handleUnfriend(friendId: string) {
        if (confirm(`Are you sure you want to unfriend ${friends.find(f => f.id === friendId)?.username}?`)) {
            try {
                await apiRequest('DELETE', `/friendships/${friendId}`, undefined, true);
                friends = friends.filter(f => f.id !== friendId);
                alert('Unfriended successfully!');
            } catch (e: any) {
                alert(`Failed to unfriend: ${e.message}`);
                console.error(e);
            }
        }
    }
</script>

<div class="space-y-4">
    {#if loading}
        <p class="text-center text-gray-600">Loading friends...</p>
    {:else if error}
        <p class="text-center text-red-600">Error: {error}</p>
    {:else if friends.length === 0}
        <p class="text-center text-gray-600">You don't have any friends yet.</p>
    {:else}
        <ul class="space-y-3">
            {#each (friends ?? []) as friend (friend.id)}
                <li class="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm">
                    <div class="flex items-center space-x-3">
                        <div class="relative">
                            <div class="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold">
                                {#if friend.avatar}
                                    <img src={friend.avatar} alt={friend.username} class="w-full h-full rounded-full object-cover" />
                                {:else}
                                    {friend.username.substring(0, 2).toUpperCase()}
                                {/if}
                            </div>
                            {#if $presenceStore[friend.id]?.status === 'online'}
                                <span class="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white"></span>
                            {/if}
                        </div>
                        <span class="font-medium text-gray-800">{friend.username}</span>
                    </div>
                    <Button variant="destructive" size="sm" onclick={() => handleUnfriend(friend.id)}>Unfriend</Button>
                </li>
            {/each}
        </ul>
    {/if}
</div>