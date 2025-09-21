<script lang="ts">
    import { apiRequest } from '$lib/api';
    import { auth } from '$lib/stores/auth.svelte';
    import { onMount } from 'svelte';
    import { Button } from '$lib/components/ui/button';

    interface FriendRequest {
        id: string; // Friendship ID
        requester_id: string;
        receiver_id: string;
        status: 'pending' | 'accepted' | 'rejected';
        requester_username?: string;
        receiver_username?: string;
        requester_avatar?: string;
        receiver_avatar?: string;
    }

    interface UserDetails {
        id: string;
        username: string;
        avatar?: string;
    }

    let incomingRequests: FriendRequest[] = [];
    let outgoingRequests: FriendRequest[] = [];
    let loading = true;
    let error: string | null = null;

    $: currentUserId = auth.state.user?.id;

    onMount(async () => {
        if (!currentUserId) {
            error = "User not authenticated.";
            loading = false;
            return;
        }
        await fetchRequests();
    });

    async function fetchRequests() {
        loading = true;
        error = null;
        try {
            const response = await apiRequest('GET', '/friendships?status=pending', undefined, true);
            const allPendingRequests: FriendRequest[] = response.data ?? [];

            const fetchedIncoming: FriendRequest[] = [];
            const fetchedOutgoing: FriendRequest[] = [];

            for (const req of allPendingRequests) {
                if (req.receiver_id === currentUserId) {
                    // Incoming request
                    const requesterDetails: UserDetails = await apiRequest('GET', `/users/${req.requester_id}`, undefined, true);
                    fetchedIncoming.push({
                        ...req,
                        requester_username: requesterDetails.username,
                        requester_avatar: requesterDetails.avatar,
                    });
                } else if (req.requester_id === currentUserId) {
                    // Outgoing request
                    const receiverDetails: UserDetails = await apiRequest('GET', `/users/${req.receiver_id}`, undefined, true);
                    fetchedOutgoing.push({
                        ...req,
                        receiver_username: receiverDetails.username,
                        receiver_avatar: receiverDetails.avatar,
                    });
                }
            }

            incomingRequests = fetchedIncoming;
            outgoingRequests = fetchedOutgoing;

        } catch (e: any) {
            error = e.message || 'Failed to load friend requests.';
            console.error(e);
        } finally {
            loading = false;
        }
    }

    async function handleRespondToRequest(requestId: string, accept: boolean) {
        try {
            await apiRequest('POST', `/friendships/requests/${requestId}/respond`, { friendship_id: requestId, accept }, true);
            alert(`Request ${accept ? 'accepted' : 'rejected'} successfully!`);
            await fetchRequests(); // Refresh lists
        } catch (e: any) {
            alert(`Failed to respond to request: ${e.message}`);
            console.error(e);
        }
    }

    async function handleCancelRequest(requestId: string) {
        if (confirm('Are you sure you want to cancel this request?')) {
            try {
                await apiRequest('DELETE', `/friendships/${requestId}`, undefined, true);
                alert('Request cancelled successfully!');
                await fetchRequests(); // Refresh lists
            } catch (e: any) {
                alert(`Failed to cancel request: ${e.message}`);
                console.error(e);
            }
        }
    }
</script>

<div class="space-y-6">
    {#if loading}
        <p class="text-center text-gray-600">Loading requests...</p>
    {:else if error}
        <p class="text-center text-red-600">Error: {error}</p>
    {:else}
        <!-- Incoming Requests -->
        <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Incoming Requests ({incomingRequests.length})</h3>
            {#if incomingRequests.length === 0}
                <p class="text-gray-600">No new incoming friend requests.</p>
            {:else}
                <ul class="space-y-3">
                    {#each incomingRequests as request (request.id)}
                        <li class="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm">
                            <div class="flex items-center space-x-3">
                                <div class="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold">
                                    {#if request.requester_avatar}
                                        <img src={request.requester_avatar} alt={request.requester_username} class="w-full h-full rounded-full object-cover" />
                                    {:else}
                                        {request.requester_username?.substring(0, 2).toUpperCase()}
                                    {/if}
                                </div>
                                <span class="font-medium text-gray-800">{request.requester_username}</span>
                            </div>
                            <div class="flex space-x-2">
                                <Button variant="default" size="sm" onclick={() => handleRespondToRequest(request.id, true)}>Accept</Button>
                                <Button variant="outline" size="sm" onclick={() => handleRespondToRequest(request.id, false)}>Reject</Button>
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>

        <!-- Outgoing Requests -->
        <div class="mt-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Outgoing Requests ({outgoingRequests.length})</h3>
            {#if outgoingRequests.length === 0}
                <p class="text-gray-600">No pending outgoing friend requests.</p>
            {:else}
                <ul class="space-y-3">
                    {#each outgoingRequests as request (request.id)}
                        <li class="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm">
                            <div class="flex items-center space-x-3">
                                <div class="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 font-bold">
                                    {#if request.receiver_avatar}
                                        <img src={request.receiver_avatar} alt={request.receiver_username} class="w-full h-full rounded-full object-cover" />
                                    {:else}
                                        {request.receiver_username?.substring(0, 2).toUpperCase()}
                                    {/if}
                                </div>
                                <span class="font-medium text-gray-800">{request.receiver_username}</span>
                            </div>
                            <Button variant="outline" size="sm" onclick={() => handleCancelRequest(request.id)}>Cancel Request</Button>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    {/if}
</div>