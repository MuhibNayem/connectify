<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import EventCard from '$lib/components/events/EventCard.svelte';
	import EventsSidebar from '$lib/components/events/EventsSidebar.svelte';
	import { Gift, ChevronRight, Loader2 } from '@lucide/svelte';
	import { getEvents, type Event } from '$lib/api';

	let events: Event[] = $state([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await getEvents(1, 20); // Fetch first 20 events
			events = res.events;
		} catch (err) {
			console.error('Failed to load events:', err);
		} finally {
			loading = false;
		}
	});
</script>

<div class="bg-background text-foreground flex h-[calc(100vh-4rem)] w-full overflow-hidden">
	<EventsSidebar />

	<!-- Main Content Feed -->
	<div class="flex-1 overflow-y-auto p-4 md:p-8">
		<div class="mx-auto max-w-5xl pb-20">
			<!-- Mobile Header -->
			<div class="mb-6 md:hidden">
				<h1 class="text-3xl font-bold">Events</h1>
				<div class="mt-4 flex gap-2 overflow-x-auto pb-2">
					<Button variant="secondary" size="sm" class="whitespace-nowrap">Discover</Button>
					<Button variant="ghost" size="sm" class="whitespace-nowrap">Your Events</Button>
					<Button variant="ghost" size="sm" class="whitespace-nowrap">Local</Button>
				</div>
			</div>

			<!-- Happening Now / Hero Area -->
			<div class="mb-8">
				<h2 class="mb-4 text-xl font-bold">Happening This Week</h2>
				<div class="relative overflow-hidden rounded-2xl">
					<div class="absolute inset-0 z-10 bg-gradient-to-t from-black/80 to-transparent"></div>
					<img
						src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2940&auto=format&fit=crop"
						alt="Featured"
						class="h-64 w-full object-cover md:h-80"
					/>
					<div class="absolute bottom-0 left-0 z-20 p-6 md:p-8">
						<div class="mb-2 text-sm font-bold uppercase tracking-wider text-red-400">
							Featured Event
						</div>
						<h1 class="mb-2 text-3xl font-black text-white md:text-4xl">Neon City Festival</h1>
						<p class="mb-4 max-w-lg truncate text-gray-200">
							Join thousands for the biggest electronic music festival of the year.
						</p>
						<div class="flex gap-3">
							<Button>Get Tickets</Button>
							<Button variant="secondary" class="bg-white/10 backdrop-blur-md hover:bg-white/20"
								>Interested</Button
							>
						</div>
					</div>
				</div>
			</div>

			<!-- Birthdays Widget -->
			<div class="bg-secondary/10 mb-8 rounded-xl border border-white/5 p-4 backdrop-blur-sm">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500"
					>
						<Gift size={20} />
					</div>
					<div class="flex-1">
						<h3 class="font-bold">Sarah, Mike, and 3 others have birthdays today.</h3>
						<p class="text-muted-foreground text-sm">Wish them a happy birthday!</p>
					</div>
					<Button size="sm" variant="ghost">View All</Button>
				</div>
			</div>

			<!-- Recommended For You (Your Events) -->
			<div class="mb-8">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xl font-bold">Recommended for You</h2>
					<Button variant="link" class="gap-1">See All <ChevronRight size={16} /></Button>
				</div>
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#if loading}
						<!-- Loading Skeleton or spinner -->
						{#each Array(3) as _}
							<div class="h-64 w-full animate-pulse rounded-xl bg-white/5"></div>
						{/each}
					{:else}
						{#each events.slice(0, 3) as event}
							<EventCard {event} />
						{/each}
					{/if}
				</div>
			</div>

			<!-- Upcoming Events Grid -->
			<div class="mb-8">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xl font-bold">Upcoming Events</h2>
					<!-- Categories Tabs -->
					<div class="hidden gap-2 md:flex">
						<Button variant="secondary" size="sm" class="h-7 text-xs">All</Button>
						<Button variant="ghost" size="sm" class="h-7 text-xs">Today</Button>
						<Button variant="ghost" size="sm" class="h-7 text-xs">Tomorrow</Button>
						<Button variant="ghost" size="sm" class="h-7 text-xs">This Week</Button>
					</div>
					<Button variant="link" class="gap-1 md:hidden">Filters</Button>
				</div>

				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#if loading}
						<div class="col-span-full flex h-40 items-center justify-center">
							<Loader2 class="animate-spin text-white" size={32} />
						</div>
					{:else if events.length === 0}
						<div class="col-span-full py-10 text-center text-gray-400">
							No upcoming events found.
						</div>
					{:else}
						{#each events as event}
							<EventCard {event} />
						{/each}
					{/if}
				</div>
			</div>

			<!-- Categories / Discovery Row -->
			<div class="mb-8">
				<h2 class="mb-4 text-xl font-bold">Explore by Category</h2>
				<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
					{#each [{ name: 'Music', img: 'https://images.unsplash.com/photo-1514525253440-b393452e3726?auto=format&fit=crop&q=80&w=1000' }, { name: 'Visual Arts', img: 'https://images.unsplash.com/photo-1460661631910-d9d3f11d9jd83?auto=format&fit=crop&q=80&w=1000' }, { name: 'Food & Drink', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=1000' }, { name: 'Sports', img: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=1000' }] as cat}
						<div class="group relative aspect-video cursor-pointer overflow-hidden rounded-xl">
							<div
								class="absolute inset-0 z-10 bg-black/40 transition-colors group-hover:bg-black/30"
							></div>
							<img
								src={cat.img}
								alt={cat.name}
								class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
							/>
							<span class="absolute bottom-3 left-4 z-20 text-lg font-bold text-white"
								>{cat.name}</span
							>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
