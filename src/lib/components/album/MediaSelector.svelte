<script lang="ts">
	import { apiRequest } from '$lib/api';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Check } from '@lucide/svelte';

	let {
		open = $bindable(false),
		userId,
		onSelect
	} = $props<{
		open: boolean;
		userId: string;
		onSelect: (selectedMedia: any[]) => void;
	}>();

	let media = $state<any[]>([]);
	let loading = $state(false);
	let selectedIds = $state<Set<string>>(new Set());
	const LIMIT = 50;
	let offset = $state(0);
	let hasMore = $state(true);

	async function fetchTimelineMedia(reset = false) {
		if (loading) return;
		loading = true;
		try {
			// 1. Get user albums to find 'timeline' album
			const albums = await apiRequest('GET', `/users/${userId}/albums`);
			const timelineAlbum = albums.find((a: any) => a.type === 'timeline');

			if (timelineAlbum) {
				if (reset) {
					media = [];
					offset = 0;
					hasMore = true;
				}

				// 2. Fetch media from timeline album, filtered by type=image
				const items = await apiRequest(
					'GET',
					`/albums/${timelineAlbum.id}/media?limit=${LIMIT}&offset=${offset}&type=image`
				);

				if (items && items.length > 0) {
					media = [...media, ...items];
					offset += items.length;
					if (items.length < LIMIT) hasMore = false;
				} else {
					hasMore = false;
				}
			}
		} catch (err) {
			console.error('Failed to fetch timeline media', err);
		} finally {
			loading = false;
		}
	}

	function toggleSelection(item: any) {
		if (selectedIds.has(item.id)) {
			selectedIds.delete(item.id);
		} else {
			selectedIds.add(item.id);
		}
		// Trigger reactivity
		selectedIds = new Set(selectedIds);
	}

	function handleConfirm() {
		const selectedItems = media.filter((item) => selectedIds.has(item.id));
		onSelect(selectedItems);
		open = false;
		selectedIds = new Set();
	}

	$effect(() => {
		if (open && userId) {
			fetchTimelineMedia(true);
			selectedIds = new Set();
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-3xl">
		<Dialog.Header>
			<Dialog.Title>Select Photos</Dialog.Title>
			<Dialog.Description>Choose photos from your timeline to add to this album.</Dialog.Description
			>
		</Dialog.Header>

		<div class="h-[60vh] overflow-y-auto p-1">
			{#if media.length === 0 && !loading}
				<div class="text-muted-foreground flex h-full items-center justify-center">
					No photos found in your timeline.
				</div>
			{:else}
				<div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
					{#each media as item}
						<button
							class="relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-all focus:outline-none {selectedIds.has(
								item.id
							)
								? 'border-primary ring-primary ring-2 ring-offset-2'
								: 'border-transparent'}"
							onclick={() => toggleSelection(item)}
						>
							{#if item.type === 'video'}
								<video src={item.url} class="h-full w-full object-cover">
									<track kind="captions" />
								</video>
								<div class="absolute inset-0 flex items-center justify-center bg-black/20">
									<div class="rounded-full bg-black/50 p-1">▶</div>
								</div>
							{:else}
								<img src={item.url} alt="Media" class="h-full w-full object-cover" />
							{/if}

							{#if selectedIds.has(item.id)}
								<div
									class="bg-primary absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm"
								>
									<Check size={14} />
								</div>
							{/if}
						</button>
					{/each}
				</div>

				{#if loading}
					<div class="flex justify-center py-4">
						<div
							class="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
						></div>
					</div>
				{:else if hasMore}
					<div class="flex justify-center py-4">
						<Button variant="outline" size="sm" onclick={() => fetchTimelineMedia()}
							>Load More</Button
						>
					</div>
				{/if}
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={handleConfirm} disabled={selectedIds.size === 0}>
				Add {selectedIds.size} Photo{selectedIds.size !== 1 ? 's' : ''}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
