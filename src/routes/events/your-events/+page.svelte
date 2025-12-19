<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import EventsSidebar from '$lib/components/events/EventsSidebar.svelte';
	import EventCard from '$lib/components/events/EventCard.svelte';
	import { Calendar, Plus, Loader2 } from '@lucide/svelte';
	import { getMyEvents, type Event } from '$lib/api';
	import { auth } from '$lib/stores/auth.svelte';

	let activeTab = $state('going'); // going, hosting, past
	let allEvents: Event[] = $state([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			// Fetch user's events (created & attending)
			allEvents = await getMyEvents(1, 100);
		} catch (err) {
			console.error('Failed to load my events:', err);
		} finally {
			loading = false;
		}
	});

	let goingEvents = $derived(
		allEvents.filter((e) => !e.is_host && new Date(e.start_date) > new Date())
	);
	let hostedEvents = $derived(
		allEvents.filter((e) => e.is_host && new Date(e.start_date) > new Date())
	);
	let pastEvents = $derived(allEvents.filter((e) => new Date(e.start_date) < new Date()));
</script>

<div class="bg-background text-foreground flex h-[calc(100vh-4rem)] w-full overflow-hidden">
	<EventsSidebar />

	<div class="flex-1 overflow-y-auto p-4 md:p-8">
		<div class="mx-auto max-w-5xl pb-20">
			<div class="mb-8 flex items-center justify-between">
				<h1 class="text-3xl font-bold">Your Events</h1>
				<Button class="gap-2">
					<Plus size={18} /> Create Event
				</Button>
			</div>

			<!-- Tabs -->
			<div class="mb-8 flex gap-2 border-b border-white/10 pb-1">
				<button
					class="px-4 py-2 text-sm font-semibold transition-colors {activeTab === 'going'
						? 'border-primary text-primary border-b-2'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (activeTab = 'going')}
				>
					Going
				</button>
				<button
					class="px-4 py-2 text-sm font-semibold transition-colors {activeTab === 'hosting'
						? 'border-primary text-primary border-b-2'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (activeTab = 'hosting')}
				>
					Hosting
				</button>
				<button
					class="px-4 py-2 text-sm font-semibold transition-colors {activeTab === 'past'
						? 'border-primary text-primary border-b-2'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (activeTab = 'past')}
				>
					Past
				</button>
			</div>

			<!-- Content -->
			<div>
				{#if loading}
					<div class="flex justify-center py-20">
						<Loader2 class="animate-spin text-white" size={48} />
					</div>
				{:else}
					{#if activeTab === 'going'}
						{#if goingEvents.length > 0}
							<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
								{#each goingEvents as event}
									<EventCard {event} />
								{/each}
							</div>
						{:else}
							<div class="text-muted-foreground flex flex-col items-center justify-center py-20">
								<Calendar size={48} class="mb-4 opacity-50" />
								<p>You haven't RSVP'd to any events yet.</p>
								<Button variant="link" href="/events">Browse Events</Button>
							</div>
						{/if}
					{/if}

					{#if activeTab === 'hosting'}
						{#if hostedEvents.length > 0}
							<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
								{#each hostedEvents as event}
									<EventCard {event} />
								{/each}
							</div>
						{:else}
							<div class="text-muted-foreground flex flex-col items-center justify-center py-20">
								<Calendar size={48} class="mb-4 opacity-50" />
								<p>You are not hosting any events.</p>
								<Button variant="link" href="/events/create">Create One</Button>
							</div>
						{/if}
					{/if}

					{#if activeTab === 'past'}
						{#if pastEvents.length > 0}
							<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
								{#each pastEvents as event}
									<EventCard {event} />
								{/each}
							</div>
						{:else}
							<div class="text-muted-foreground flex flex-col items-center justify-center py-20">
								<Calendar size={48} class="mb-4 opacity-50" />
								<p>No past events found.</p>
							</div>
						{/if}
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div>
