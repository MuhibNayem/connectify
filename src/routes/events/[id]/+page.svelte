<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import EventHero from '$lib/components/events/EventHero.svelte';
	import EventsSidebar from '$lib/components/events/EventsSidebar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Calendar, MapPin, Ticket, Loader2 } from '@lucide/svelte';
	import { getEvent, type Event } from '$lib/api';

	let event: Event | null = $state(null);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const id = $page.params.id;
			if (id) {
				event = await getEvent(id);
			}
		} catch (err) {
			console.error('Failed to load event:', err);
			error = 'Failed to load event details.';
		} finally {
			loading = false;
		}
	});
</script>

<div class="bg-background text-foreground flex h-[calc(100vh-4rem)] w-full overflow-hidden">
	<EventsSidebar />

	<div class="flex-1 overflow-y-auto">
		<div class="pb-20">
			{#if loading}
				<div class="flex h-[50vh] items-center justify-center">
					<Loader2 class="animate-spin text-white" size={48} />
				</div>
			{:else if error || !event}
				<div class="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
					<h2 class="text-2xl font-bold">Event not found</h2>
					<p class="text-muted-foreground">
						{error || "The event you're looking for doesn't exist."}
					</p>
					<Button href="/events" variant="outline">Back to Events</Button>
				</div>
			{:else}
				<EventHero {event} />

				<div class="mx-auto mt-8 grid max-w-5xl gap-8 px-4 md:grid-cols-3">
					<!-- Left Column: Details -->
					<div class="space-y-6 md:col-span-2">
						<!-- About Section -->
						<div class="glass-card bg-card rounded-xl border border-white/5 p-6 shadow-sm">
							<h2 class="mb-4 text-xl font-bold">About Event</h2>
							<p class="text-muted-foreground whitespace-pre-line leading-relaxed">
								{event.description}
							</p>
						</div>

						<!-- Discussion Placeholder -->
						<div class="glass-card bg-card rounded-xl border border-white/5 p-6 shadow-sm">
							<div class="mb-4 flex items-center justify-between">
								<h2 class="text-xl font-bold">Discussion</h2>
								<Button variant="ghost" size="sm">View All</Button>
							</div>

							<div class="flex items-start gap-4">
								<div class="bg-secondary h-10 w-10 overflow-hidden rounded-full">
									<img src="https://github.com/shadcn.png" alt="" />
								</div>
								<div class="bg-secondary/30 flex-1 rounded-xl p-3">
									<input
										type="text"
										placeholder="Post something..."
										class="w-full bg-transparent text-sm outline-none"
									/>
								</div>
							</div>
						</div>
					</div>

					<!-- Right Column: Sidebar info -->
					<div class="space-y-6">
						<div
							class="glass-card bg-card space-y-4 rounded-xl border border-white/5 p-6 shadow-sm"
						>
							<h3 class="text-lg font-bold">Event Details</h3>

							<div class="flex gap-4">
								<Calendar class="text-muted-foreground shrink-0" />
								<div>
									<div class="font-semibold">
										{new Date(event.start_date).toLocaleDateString(undefined, {
											weekday: 'long',
											month: 'long',
											day: 'numeric'
										})}
									</div>
									<div class="text-muted-foreground text-sm">
										{new Date(event.start_date).toLocaleTimeString(undefined, {
											hour: 'numeric',
											minute: '2-digit'
										})}
										{#if event.end_date}
											- {new Date(event.end_date).toLocaleTimeString(undefined, {
												hour: 'numeric',
												minute: '2-digit'
											})}
										{/if}
									</div>
									<div class="mt-1 cursor-pointer text-xs text-blue-400 hover:underline">
										Add to Calendar
									</div>
								</div>
							</div>

							<div class="flex gap-4">
								<MapPin class="text-muted-foreground shrink-0" />
								<div>
									<div class="font-semibold">{event.location}</div>
									<div class="text-muted-foreground text-sm">
										{event.is_online ? 'Online Event' : 'In Person'}
									</div>
									<div class="mt-1 cursor-pointer text-xs text-blue-400 hover:underline">
										Show Map
									</div>
								</div>
							</div>

							<div class="flex gap-4">
								<Ticket class="text-muted-foreground shrink-0" />
								<div>
									<div class="font-semibold">Tickets Available</div>
									<div class="text-muted-foreground text-sm">See details</div>
									<Button class="mt-2 w-full" size="sm">Find Tickets</Button>
								</div>
							</div>
						</div>

						<div class="glass-card bg-card rounded-xl border border-white/5 p-6 shadow-sm">
							<h3 class="mb-4 text-lg font-bold">Guest List</h3>
							<div class="text-muted-foreground mb-4 flex justify-between text-sm">
								<span>{event.stats.going_count} Going</span>
								<span>{event.stats.invited_count} Invited</span>
							</div>

							<div class="grid grid-cols-4 gap-2">
								{#each Array(Math.min(8, event.stats.going_count || 8)) as _, i}
									<div class="bg-secondary/50 aspect-square overflow-hidden rounded-lg">
										<img
											src={`https://i.pravatar.cc/100?u=${event.id}${i}`}
											alt=""
											class="h-full w-full object-cover"
										/>
									</div>
								{/each}
							</div>
							<Button variant="secondary" class="mt-4 w-full">See All</Button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
