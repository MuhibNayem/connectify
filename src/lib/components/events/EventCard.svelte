<script lang="ts">
	import { MapPin, Users } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Event } from '$lib/api';

	let { event }: { event: Event } = $props();

	function formatDate(dateStr: string) {
		const date = new Date(dateStr);
		return {
			month: date.toLocaleString('default', { month: 'short' }).toUpperCase(),
			day: date.getDate(),
			time: date.toLocaleTimeString('default', { hour: 'numeric', minute: '2-digit' })
		};
	}

	let dateInfo = $derived(formatDate(event.start_date));
</script>

<div
	class="glass-card group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:shadow-lg"
>
	<!-- Cover Image -->
	<div class="relative h-48 w-full overflow-hidden">
		<img
			src={event.cover_image}
			alt={event.title}
			class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
		/>
		<div
			class="absolute left-4 top-4 flex flex-col items-center rounded-lg bg-white/90 px-3 py-1 shadow-sm backdrop-blur-md"
		>
			<span class="text-xs font-bold text-red-500">{dateInfo.month}</span>
			<span class="text-xl font-black text-gray-900">{dateInfo.day}</span>
		</div>
		<div
			class="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-md"
		>
			{event.category}
		</div>
	</div>

	<!-- Content -->
	<div class="p-4">
		<div class="mb-1 text-xs font-semibold text-red-400">{dateInfo.time}</div>
		<h3
			class="group-hover:text-primary mb-2 truncate text-lg font-bold text-white transition-colors"
		>
			<a href="/events/{event.id}" class="after:absolute after:inset-0">{event.title}</a>
		</h3>
		<div class="mb-4 space-y-1 text-sm text-gray-400">
			<div class="flex items-center gap-2">
				<MapPin size={14} />
				<span class="truncate">{event.location}</span>
			</div>
			<div class="flex items-center gap-2">
				<Users size={14} />
				<span>{event.stats.going_count} going</span>
			</div>
		</div>

		<div class="flex items-center justify-between">
			<div class="flex -space-x-2 overflow-hidden">
				<!-- Mock Faces (Backend doesn't provide attendee images in list yet) -->
				{#each Array(3) as _, i}
					<img
						class="inline-block h-6 w-6 rounded-full ring-2 ring-black"
						src={`https://i.pravatar.cc/100?u=${event.id}${i}`}
						alt=""
					/>
				{/each}
				<div
					class="flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-[10px] text-white ring-2 ring-black"
				>
					+{event.stats.going_count > 3 ? event.stats.going_count - 3 : 0}
				</div>
			</div>
			<Button variant="secondary" size="sm" class="relative z-10 bg-white/10 hover:bg-white/20">
				Interested
			</Button>
		</div>
	</div>
</div>
