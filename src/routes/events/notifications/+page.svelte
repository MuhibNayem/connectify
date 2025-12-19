<script lang="ts">
	import EventsSidebar from '$lib/components/events/EventsSidebar.svelte';
	import { Bell, Calendar } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	const notifications = [
		{
			id: 1,
			text: 'Sarah invited you to "Summer Rooftop Party"',
			time: '2 hours ago',
			read: false
		},
		{
			id: 2,
			text: 'Event "Tech Mixer" is starting in 1 hour',
			time: '1 hour ago',
			read: true
		},
		{
			id: 3,
			text: 'Mike commented on "Sunday Yoga"',
			time: '5 hours ago',
			read: true
		}
	];
</script>

<div class="bg-background text-foreground flex h-[calc(100vh-4rem)] w-full overflow-hidden">
	<EventsSidebar />

	<div class="flex-1 overflow-y-auto p-4 md:p-8">
		<div class="mx-auto max-w-2xl pb-20">
			<div class="mb-8 flex items-center justify-between">
				<h1 class="text-3xl font-bold">Event Notifications</h1>
				<Button variant="ghost" size="sm">Mark all as read</Button>
			</div>

			<div class="glass-card bg-card divide-y divide-white/5 rounded-xl border border-white/5">
				{#each notifications as notif}
					<div
						class="flex gap-4 p-4 transition-colors hover:bg-white/5 {notif.read
							? 'opacity-70'
							: ''}"
					>
						<div
							class="bg-primary/10 text-primary mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
						>
							<Bell size={20} />
						</div>
						<div class="flex-1">
							<p class="font-medium">{notif.text}</p>
							<p class="text-muted-foreground text-sm">{notif.time}</p>
						</div>
						{#if !notif.read}
							<div class="bg-primary mt-2 h-2 w-2 rounded-full"></div>
						{/if}
					</div>
				{/each}

				{#if notifications.length === 0}
					<div class="text-muted-foreground flex flex-col items-center justify-center py-12">
						<Bell size={48} class="mb-4 opacity-50" />
						<p>No new notifications</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
