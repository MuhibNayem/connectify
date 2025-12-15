<!--
Component to display a list of conversations (both direct messages and groups).
Fetches friends and groups to populate the list.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getConversationSummaries, type ConversationSummary } from '$lib/api';
	import { auth } from '$lib/stores/auth.svelte';
	import Skeleton from '$lib/components/ui/skeleton.svelte';
	import { presenceStore, type PresenceState } from '$lib/stores/presence';
	import { formatDistanceToNow } from 'date-fns';
	import CreateGroupModal from './CreateGroupModal.svelte';
	import { Plus } from '@lucide/svelte';

	let conversations = $state<ConversationSummary[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let showCreateGroupModal = $state(false);
	let presenceState = $state<PresenceState>({});

	presenceStore.subscribe((value) => {
		presenceState = value;
	});

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
			class="rounded-full bg-blue-500 p-2 text-white shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
			on:click={() => (showCreateGroupModal = true)}
		>
			<Plus class="h-6 w-6" />
		</button>
	</div>

	<!-- Conversation List -->
	<div class="flex-1 overflow-y-auto">
		{#if isLoading}
			<div class="space-y-3 p-4">
				{#each Array(5) as _, i (i)}
					<div class="flex items-center space-x-3">
						<Skeleton class="h-12 w-12 rounded-full" />
						<div class="flex-1 space-y-2">
							<Skeleton class="h-4 w-3/4" />
							<Skeleton class="h-4 w-1/2" />
						</div>
					</div>
				{/each}
			</div>
		{:else if error}
			<div class="p-4 text-red-500">{error}</div>
		{:else if conversations.length === 0}
			<div class="p-4 text-center text-gray-500">No conversations yet.</div>
		{:else}
			<ul class="divide-y divide-gray-200">
				{#each conversations as conv (conv.id)}
					{@const conversationId = $page.params.id}
					{@const isActive = conversationId === `${conv.is_group ? 'group' : 'user'}-${conv.id}`}
					{@const isOnline = !conv.is_group && presenceState[conv.id]?.status === 'online'}
					<li>
						<a
							href={getConversationUrl(conv)}
							class="flex items-center p-3 transition duration-150 ease-in-out hover:bg-gray-100 {isActive
								? 'bg-blue-50'
								: ''}"
						>
							<div class="relative">
								<img
									class="mr-4 h-12 w-12 rounded-full"
									src={conv.avatar ?? `https://i.pravatar.cc/150?u=${conv.id}`}
									alt="{conv.name}'s avatar"
								/>
								{#if isOnline}
									<span
										class="absolute bottom-0 right-4 h-3 w-3 rounded-full border-2 border-white bg-green-500"
									></span>
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<p class="truncate font-semibold text-gray-800">{conv.name}</p>
								{#if conv.last_message_content}
									<div class="flex items-center text-sm text-gray-500">
										<p class="max-w-[140px] truncate">{conv.last_message_content}</p>
										{#if conv.last_message_timestamp}
											<span class="mx-1">•</span>
											<span>
												{formatDistanceToNow(new Date(conv.last_message_timestamp), {
													addSuffix: false
												})
													.replace('about ', '')
													.replace('less than a minute', 'just now')
													.replace(' minute', 'm')
													.replace(' minutes', 'm')
													.replace(' hour', 'h')
													.replace(' hours', 'h')
													.replace(' day', 'd')
													.replace(' days', 'd')}
											</span>
										{/if}
									</div>
								{/if}
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<CreateGroupModal
		bind:showModal={showCreateGroupModal}
		onGroupCreated={() => {
			// Reload conversations
			window.location.reload(); // Simple reload for now or re-fetch
		}}
	/>
</div>
