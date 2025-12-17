<script lang="ts">
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth.svelte';
	import { getFriendships } from '$lib/api';
	import { onMount } from 'svelte';
	import { websocketMessages } from '$lib/websocket';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import Skeleton from '$lib/components/ui/skeleton/Skeleton.svelte';
	import { Users, Globe, Calendar, ShoppingBag, Settings, User } from '@lucide/svelte';

	let currentUser = $derived(auth.state.user);
	let friends = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let presenceState = $state<Record<string, { status: string; last_seen?: string }>>({});

	async function fetchFriends() {
		try {
			const response = await getFriendships('accepted');
			friends = response.data || [];
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (currentUser) {
			fetchFriends();
		}
	});

	onMount(() => {
		const unsubscribe = websocketMessages.subscribe((event) => {
			if (event?.type === 'PresenceUpdate') {
				const { user_id, status, last_seen } = event.data;
				presenceState = {
					...presenceState,
					[user_id]: { status, last_seen }
				};
			}
		});

		return () => {
			unsubscribe();
		};
	});

	function isActive(path: string) {
		return $page.url.pathname === path;
	}
</script>

<div class="space-y-4">
	<!-- User Profile Link -->
	{#if currentUser}
		<a
			href={`/profile/${currentUser.id}`}
			class="text-foreground hover:bg-primary/10 flex items-center space-x-3 rounded-xl border-transparent bg-transparent p-2 transition-all hover:shadow-sm"
		>
			<Avatar class="ring-primary/20 h-8 w-8 ring-2">
				<AvatarImage src={currentUser.avatar} alt={currentUser.username} />
				<AvatarFallback>{currentUser.username.charAt(0).toUpperCase()}</AvatarFallback>
			</Avatar>
			<span class="font-medium">{currentUser.full_name || currentUser.username}</span>
		</a>
	{/if}

	<!-- Main Navigation Links -->
	<nav class="space-y-1">
		{#each [{ href: '/friends', label: 'Friends', icon: Users }, { href: '/communities', label: 'Communities', icon: Globe }, { href: '/events', label: 'Events', icon: Calendar }, { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag }, { href: '/settings', label: 'Settings', icon: Settings }] as item}
			<a
				href={item.href}
				class="hover:bg-primary/10 hover:text-primary flex items-center space-x-3 rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] active:scale-95 {isActive(
					item.href
				)
					? 'bg-primary/15 text-primary font-semibold shadow-sm'
					: 'text-muted-foreground'}"
			>
				<svelte:component
					this={item.icon}
					size={22}
					class={isActive(item.href)
						? 'text-primary'
						: 'text-muted-foreground group-hover:text-primary'}
				/>
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>

	<!-- Separator -->
	<hr class="border-white/10" />

	<!-- Friends List -->
	<div class="space-y-1">
		<h3 class="text-muted-foreground px-2 text-xs font-semibold uppercase">Friends</h3>
		{#if loading}
			<div class="space-y-3 px-2">
				{#each Array(3) as _}
					<div class="flex items-center space-x-3">
						<Skeleton class="bg-primary/10 h-8 w-8 rounded-full" />
						<Skeleton class="bg-primary/10 h-4 w-24" />
					</div>
				{/each}
			</div>
		{:else if error}
			<p class="p-2 text-red-500">{error}</p>
		{:else if friends.length === 0}
			<p class="text-muted-foreground p-2">No friends to show.</p>
		{:else}
			<ul class="space-y-1">
				{#each friends as friend (friend.id)}
					{@const friendUser =
						friend.receiver_id === currentUser?.id ? friend.requester_info : friend.receiver_info}
					{@const isOnline = presenceState[friendUser.id]?.status === 'online'}
					<li>
						<a
							href={`/profile/${friendUser.id}`}
							class="hover:bg-primary/10 flex items-center space-x-3 rounded-xl p-2 transition-all"
						>
							<div class="relative">
								<Avatar class="h-8 w-8">
									<AvatarImage src={friendUser.avatar} alt={friendUser.username} />
									<AvatarFallback>{friendUser.username.charAt(0).toUpperCase()}</AvatarFallback>
								</Avatar>
								{#if isOnline}
									<span
										class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500"
									></span>
								{/if}
							</div>
							<span class="text-foreground/90 text-sm font-medium"
								>{friendUser.full_name || friendUser.username}</span
							>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
