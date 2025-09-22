<!--
Component to display a list of conversations (both direct messages and groups).
Fetches friends and groups to populate the list.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getConversationSummaries, type ConversationSummary } from '$lib/api';
	import { auth } from '$lib/stores/auth.svelte';

	let conversations = $state<ConversationSummary[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let showCreateGroupModal = $state(false);

	onMount(async () => {
		if (!auth.state.user) {
			error = 'User not authenticated.';
			isLoading = false;
			return;
		}

		try {
			const fetchedConversations = await getConversationSummaries();
			conversations = fetchedConversations;

			// Sort conversations by timestamp of last message (newest first)
			conversations = conversations.sort((a, b) => {
				const timeA = a.last_message_timestamp ? new Date(a.last_message_timestamp).getTime() : 0;
				const timeB = b.last_message_timestamp ? new Date(b.last_message_timestamp).getTime() : 0;
				return timeB - timeA;
			});
		} catch (e: any) {
			error = e.message || 'Failed to load conversations.';
		} finally {
			isLoading = false;
		}
	});

	function getConversationUrl(conv: ConversationSummary): string {
		const typePrefix = conv.is_group ? 'group' : 'user';
		return `/messages/${typePrefix}-${conv.id}`;
	}
</script>

<div class="flex h-full flex-col border-r border-gray-200 bg-gray-50">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-gray-200 p-4">
		<h1 class="text-xl font-bold text-gray-800">Chats</h1>
		<button
			class="focus:ring-opacity-50 rounded-full bg-blue-500 p-2 text-white shadow-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			on:click={() => (showCreateGroupModal = true)}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="h-6 w-6"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M18 18.75V10.5m0 0l3 3m-3-3l-3 3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM12 18.75v-7.5m0 0l-3 3m3-3l3 3M9 18.75V10.5m0 0l3 3m-3-3l-3 3"
				/>
			</svg>
		</button>
	</div>

	<!-- Conversation List -->
	<div class="flex-1 overflow-y-auto">
		{#if isLoading}
			<div class="p-4 text-center text-gray-500">Loading chats...</div>
		{:else if error}
			<div class="p-4 text-red-500">{error}</div>
		{:else if conversations.length === 0}
			<div class="p-4 text-center text-gray-500">No conversations yet.</div>
		{:else}
			<ul class="divide-y divide-gray-200">
				{#each conversations as conv (conv.id)}
					{@const conversationId = $page.params.id}
					{@const isActive = conversationId === `${conv.is_group ? 'group' : 'user'}-${conv.id}`}
					<li>
						<a
							href={getConversationUrl(conv)}
							class="flex items-center p-3 transition duration-150 ease-in-out hover:bg-gray-100 {isActive
								? 'bg-blue-50'
								: ''}"
						>
							<img
								class="mr-4 h-12 w-12 rounded-full"
								src={conv.avatar ?? `https://i.pravatar.cc/150?u=${conv.id}`}
								alt="{conv.name}'s avatar"
							/>
							<div class="min-w-0 flex-1">
								<p class="truncate font-semibold text-gray-800">{conv.name}</p>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
