<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getFriendships,
		type PopulatedFriendship,
		type FriendshipStatus
	} from '$lib/api';
	import { auth } from '$lib/stores/auth.svelte';
	import { presenceStore, type PresenceState } from '$lib/stores/presence';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';

	let friends = $state<PopulatedFriendship[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let presenceState = $state<PresenceState>({});

	const currentUser = auth.state.user;

	presenceStore.subscribe((value) => {
		presenceState = value;
	});

	onMount(async () => {
		if (!currentUser) {
			error = 'User not authenticated.';
			isLoading = false;
			return;
		}

		try {
			const response = await getFriendships('accepted');
			friends = response.data;
		} catch (e: any) {
			error = e.message || 'Failed to load friends.';
		} finally {
			isLoading = false;
		}
	});
</script>

<div class="space-y-4">
	<!-- User Profile Link -->
	{#if currentUser}
		<a
			href={`/profile/${currentUser.id}`}
			class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
		>
			<Avatar class="h-8 w-8">
				<AvatarImage src={currentUser.avatar} alt={currentUser.username} />
				<AvatarFallback>{currentUser.username.charAt(0).toUpperCase()}</AvatarFallback>
			</Avatar>
			<span class="text-gray-800 font-medium">{currentUser.full_name || currentUser.username}</span>
		</a>
	{/if}

	<!-- Main Navigation Links -->
	<nav class="space-y-1">
		<a
			href="/friends"
			class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
		>
			<!-- <Users size={20} /> -->
			<span class="text-xl">👥</span>
			<span class="text-gray-700">Friends</span>
		</a>
		<a
			href="/groups"
			class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
		>
			<!-- <Group size={20} /> -->
			<span class="text-xl">🏘️</span>
			<span class="text-gray-700">Groups</span>
		</a>
		<a
			href="/events"
			class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
		>
			<!-- <Calendar size={20} /> -->
			<span class="text-xl">🗓️</span>
			<span class="text-gray-700">Events</span>
		</a>
		<a
			href="/marketplace"
			class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
		>
			<!-- <ShoppingBag size={20} /> -->
			<span class="text-xl">🛍️</span>
			<span class="text-gray-700">Marketplace</span>
		</a>
		<!-- Add more links as needed -->
	</nav>

	<!-- Separator -->
	<hr class="border-gray-200" />

	<!-- Friends List -->
	<div class="space-y-1">
		<h3 class="text-xs font-semibold text-gray-500 uppercase px-2">Friends</h3>
		{#if isLoading}
			<p class="p-2 text-gray-500">Loading friends...</p>
		{:else if error}
			<p class="p-2 text-red-500">{error}</p>
		{:else if friends.length === 0}
			<p class="p-2 text-gray-500">No friends to show.</p>
		{:else}
			<ul class="space-y-1">
				{#each friends as friend (friend.id)}
					{@const friendUser = friend.receiver_id === currentUser?.id ? friend.requester_info : friend.receiver_info}
					{@const isOnline = presenceState[friendUser.id]?.status === 'online'}
					<li>
						<a
							href={`/profile/${friendUser.id}`}
							class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
						>
							<div class="relative">
								<Avatar class="h-8 w-8">
									<AvatarImage src={friendUser.avatar} alt={friendUser.username} />
									<AvatarFallback>{friendUser.username.charAt(0).toUpperCase()}</AvatarFallback>
								</Avatar>
								{#if isOnline}
									<span
										class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white"
									></span>
								{/if}
							</div>
							<span class="text-gray-700">{friendUser.full_name || friendUser.username}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
