<script lang="ts">
    import { createGroup } from '$lib/api';
    import { auth } from '$lib/stores/auth.svelte';
    import { getFriends } from '$lib/api'; // Assuming a getFriends API exists
    import type { User } from '$lib/types';

    export let showModal: boolean;
    export let onGroupCreated: () => void;

    let groupName = '';
    let selectedParticipants: string[] = [];
    let friends: User[] = [];
    let isLoadingFriends = true;
    let error: string | null = null;
    let isCreatingGroup = false;

    $: if (showModal) {
        groupName = '';
        selectedParticipants = [];
        loadFriends();
    }

    async function loadFriends() {
        isLoadingFriends = true;
        try {
            // Assuming getFriends returns a list of User objects
            friends = await getFriends();
        } catch (e: any) {
            error = e.message || 'Failed to load friends.';
        } finally {
            isLoadingFriends = false;
        }
    }

    function toggleParticipant(userId: string) {
        if (selectedParticipants.includes(userId)) {
            selectedParticipants = selectedParticipants.filter(id => id !== userId);
        } else {
            selectedParticipants = [...selectedParticipants, userId];
        }
    }

    async function handleSubmit() {
        if (!groupName.trim() || selectedParticipants.length === 0 || isCreatingGroup) return;

        isCreatingGroup = true;
        try {
            // Add current user to participants if not already there
            const allParticipants = auth.state.user ? [...new Set([...selectedParticipants, auth.state.user.id])] : selectedParticipants;
            await createGroup(groupName, allParticipants);
            onGroupCreated();
            showModal = false;
        } catch (e: any) {
            error = e.message || 'Failed to create group.';
        } finally {
            isCreatingGroup = false;
        }
    }
</script>

{#if showModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900 bg-opacity-50">
        <div class="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 class="mb-4 text-xl font-semibold">Create New Group</h3>
            <form on:submit|preventDefault={handleSubmit}>
                <div class="mb-4">
                    <label for="groupName" class="mb-2 block text-sm font-medium text-gray-700">Group Name</label>
                    <input
                        type="text"
                        id="groupName"
                        bind:value={groupName}
                        class="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter group name"
                        required
                    />
                </div>

                <div class="mb-4">
                    <label class="mb-2 block text-sm font-medium text-gray-700">Select Participants</label>
                    {#if isLoadingFriends}
                        <p>Loading friends...</p>
                    {:else if error}
                        <p class="text-red-500">{error}</p>
                    {:else if friends.length === 0}
                        <p>No friends to add.</p>
                    {:else}
                        <div class="max-h-40 overflow-y-auto rounded-lg border border-gray-300 p-2">
                            {#each friends as friend (friend.id)}
                                <div class="flex items-center justify-between py-1">
                                    <label for="friend-{friend.id}" class="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="friend-{friend.id}"
                                            value={friend.id}
                                            checked={selectedParticipants.includes(friend.id)}
                                            on:change={() => toggleParticipant(friend.id)}
                                            class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span class="ml-2 text-sm text-gray-900">{friend.username}</span>
                                    </label>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>

                {#if error}
                    <p class="mb-4 text-sm text-red-500">{error}</p>
                {/if}

                <div class="flex justify-end space-x-2">
                    <button
                        type="button"
                        on:click={() => (showModal = false)}
                        class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isCreatingGroup || !groupName.trim() || selectedParticipants.length === 0}
                        class="inline-flex justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {#if isCreatingGroup}Creating...{:else}Create Group{/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
