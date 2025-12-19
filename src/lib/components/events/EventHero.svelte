<script lang="ts">
	import { Calendar, MapPin, Clock, Share2, MoreHorizontal } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Event } from '$lib/api';

	let { event }: { event: Event } = $props();

	function formatFullDate(start: string, end?: string) {
		const s = new Date(start);
		const e = end ? new Date(end) : undefined;

		const dateStr = s.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});

		let timeStr = s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		if (e) {
			timeStr += ` - ${e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
		}

		return { dateStr, timeStr };
	}

	let dateInfo = $derived(formatFullDate(event.start_date, event.end_date));
</script>

<div class="relative w-full overflow-hidden rounded-b-3xl bg-black shadow-2xl">
	<!-- Background Blur -->
	<div
		class="absolute inset-0 bg-cover bg-center opacity-50 blur-3xl"
		style="background-image: url('{event.cover_image}')"
	></div>

	<!-- Main Cover -->
	<div class="relative mx-auto max-w-5xl">
		<div class="aspect-[21/9] w-full overflow-hidden md:rounded-b-2xl">
			<img src={event.cover_image} alt={event.title} class="h-full w-full object-cover" />
		</div>

		<!-- Glass Info Overlay (Floating overlap) -->
		<div class="relative -mt-20 px-4 pb-8 md:px-8">
			<div
				class="glass-card flex flex-col gap-6 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl md:flex-row md:items-end md:justify-between"
			>
				<!-- Date Badge & Title -->
				<div class="flex flex-col gap-4 md:flex-row md:items-start">
					<div
						class="hidden flex-col items-center rounded-xl bg-white/10 px-4 py-3 text-white backdrop-blur-md md:flex"
					>
						<span class="text-sm font-bold uppercase text-red-400"
							>{new Date(event.start_date).toLocaleString('default', { month: 'short' })}</span
						>
						<span class="text-3xl font-black">{new Date(event.start_date).getDate()}</span>
					</div>

					<div class="space-y-1">
						<div class="font-bold uppercase tracking-wide text-red-400 md:hidden">
							{dateInfo.dateStr}
						</div>
						<h1 class="text-3xl font-bold text-white md:text-5xl">{event.title}</h1>
						<div class="flex items-center gap-2 text-gray-300">
							<span class="font-medium">{dateInfo.dateStr}</span>
							<span class="h-1 w-1 rounded-full bg-gray-500"></span>
							<span>{dateInfo.timeStr}</span>
						</div>
						<div class="flex items-center gap-2 text-gray-300">
							<MapPin size={16} />
							<span>{event.location}</span>
						</div>
						<div class="flex items-center gap-2 pt-2 text-sm text-gray-400">
							<span>Hosted by</span>
							<div class="flex items-center gap-1 text-white">
								<img
									src={event.creator.avatar || 'https://github.com/shadcn.png'}
									alt=""
									class="h-5 w-5 rounded-full"
								/>
								<span class="font-semibold"
									>{event.creator.full_name || event.creator.username}</span
								>
							</div>
						</div>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
					<div class="flex -space-x-3 md:mr-4">
						{#each Array(4) as _, i}
							<div class="h-10 w-10 rounded-full border-2 border-black bg-gray-700">
								<img
									src={`https://i.pravatar.cc/100?u=${event.id}${i + 10}`}
									alt=""
									class="h-full w-full rounded-full object-cover"
								/>
							</div>
						{/each}
					</div>

					<div class="flex gap-2">
						<Button class="flex-1 bg-red-500 font-semibold hover:bg-red-600 md:flex-none">
							Going
						</Button>
						<Button variant="secondary" class="flex-1 bg-white/10 hover:bg-white/20 md:flex-none">
							Interested
						</Button>
						<Button variant="ghost" size="icon" class="bg-white/5 hover:bg-white/10">
							<Share2 size={20} />
						</Button>
						<Button variant="ghost" size="icon" class="bg-white/5 hover:bg-white/10">
							<MoreHorizontal size={20} />
						</Button>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
