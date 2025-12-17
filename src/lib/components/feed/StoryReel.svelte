<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { Plus, Video, Image as ImageIcon, Film } from '@lucide/svelte';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { apiRequest } from '$lib/api';
	import { onMount } from 'svelte';

	let currentUser = $derived(auth.state.user);
	let activeTab = $state<'stories' | 'reels'>('stories');
	let stories = $state<any[]>([]);
	let reels = $state<any[]>([]);
	let isLoading = $state(false);
	import { uploadFiles } from '$lib/api';
	import StoryComposer from './StoryComposer.svelte';
	import StoryViewer from './StoryViewer.svelte';

	let fileInput: HTMLInputElement;
	let showViewer = $state(false);
	let viewingGroupIndex = $state(0);
	// Grouped stories for the viewer: array of { user: Author, stories: Story[] }
	let storyGroups = $state<any[]>([]);

	// Composer State
	let showComposer = $state(false);
	let selectedFile = $state<File | null>(null);

	async function fetchStories() {
		try {
			// In a real app, this endpoint would return friends' active stories
			const res = await apiRequest('GET', '/stories', undefined, true);
			const rawStories = res || [];

			// Group by user
			const groups: Record<string, any> = {};
			rawStories.forEach((story: any) => {
				const userId = story.author?.id || story.user_id;
				if (!groups[userId]) {
					groups[userId] = {
						user: story.author || { username: 'Unknown', avatar: '' }, // Fallback
						stories: []
					};
				}
				groups[userId].stories.push(story);
			});

			storyGroups = Object.values(groups);
			stories = rawStories; // Keep raw for reference if needed, but UI uses groups
		} catch (error) {
			console.error('Failed to fetch stories:', error);
		}
	}

	async function fetchReels() {
		try {
			const res = await apiRequest('GET', '/reels?limit=10', undefined, true);
			reels = res || [];
		} catch (error) {
			console.error('Failed to fetch reels:', error);
		}
	}

	onMount(() => {
		fetchStories();
		fetchReels();
	});

	function openViewer(index: number) {
		viewingGroupIndex = index;
		showViewer = true;
	}

	// Privacy State (Def. to Friends, user changes in composer)

	async function handleCreate() {
		fileInput?.click();
	}

	async function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const file = target.files[0];

			// 1. Validate File Size
			const maxSize = activeTab === 'reels' ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
			if (file.size > maxSize) {
				alert(`File too large. Max size is ${activeTab === 'reels' ? '100MB' : '50MB'}.`);
				target.value = '';
				return;
			}

			// 2. Validate Video Constraints
			if (file.type.startsWith('video/')) {
				const videoUrl = URL.createObjectURL(file);
				const videoEl = document.createElement('video');
				videoEl.src = videoUrl;

				await new Promise((resolve, reject) => {
					videoEl.onloadedmetadata = () => {
						const maxDuration = activeTab === 'reels' ? 60 : 30;
						if (videoEl.duration > maxDuration) {
							alert(`Video too long. Max duration is ${maxDuration} seconds.`);
							reject('Metadata check failed');
							return;
						}
						// Max 1080p height
						if (videoEl.videoHeight > 1920) {
							alert(`Resolution too high. Max 1080p (1920px height).`);
							reject('Metadata check failed');
							return;
						}
						resolve(true);
					};
					videoEl.onerror = () => reject('Failed to load video metadata');
				}).catch(() => {
					target.value = '';
					URL.revokeObjectURL(videoUrl);
					return;
				});
				URL.revokeObjectURL(videoUrl);
				if (!target.value) return; // Validation failed
			}

			// OPEN COMPOSER INSTEAD OF UPLOADING
			selectedFile = file;
			showComposer = true;

			// Reset input so selecting same file works again if cancelled
			target.value = '';
		}
	}

	async function handlePost(privacy: string, allowed: string[], blocked: string[]) {
		if (!selectedFile) return;

		try {
			// 1. Upload file
			const uploaded = await uploadFiles([selectedFile]);

			if (uploaded && uploaded.length > 0) {
				const mediaUrl = uploaded[0].url;
				const mediaType = selectedFile.type.startsWith('video') ? 'video' : 'image';

				if (activeTab === 'stories') {
					await apiRequest(
						'POST',
						'/stories',
						{
							media_url: mediaUrl,
							media_type: mediaType,
							privacy: privacy,
							allowed_viewers: allowed,
							blocked_viewers: blocked
						},
						true
					);
					fetchStories();
				} else {
					await apiRequest(
						'POST',
						'/reels',
						{
							video_url: mediaUrl,
							thumbnail_url: mediaUrl,
							caption: 'New Reel',
							duration: 0
						},
						true
					);
					fetchReels();
				}
			}
		} catch (error) {
			console.error('Failed to create story/reel:', error);
			alert('Failed to upload. Please try again.');
		} finally {
			showComposer = false;
			selectedFile = null;
		}
	}
</script>

<input
	type="file"
	accept={activeTab === 'stories' ? 'image/*,video/*' : 'video/*'}
	class="hidden"
	bind:this={fileInput}
	onchange={handleFileSelect}
/>

{#if showViewer}
	<StoryViewer
		{storyGroups}
		initialGroupIndex={viewingGroupIndex}
		onClose={() => (showViewer = false)}
	/>
{/if}

{#if showComposer && selectedFile}
	<StoryComposer
		file={selectedFile}
		mediaType={selectedFile.type.startsWith('video') ? 'video' : 'image'}
		{activeTab}
		onClose={() => {
			showComposer = false;
			selectedFile = null;
		}}
		onPost={handlePost}
	/>
{/if}

<div class="relative w-full py-2">
	<!-- Tabs -->
	<div class="mb-4 flex space-x-4 px-1">
		<button
			class="flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-semibold transition-all {activeTab ===
			'stories'
				? 'bg-primary/20 text-primary'
				: 'text-muted-foreground hover:bg-black/5'}"
			onclick={() => (activeTab = 'stories')}
		>
			<div
				class="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full {activeTab ===
				'stories'
					? 'bg-primary text-white'
					: ''}"
			>
				<ImageIcon size={16} />
			</div>
			<span>Stories</span>
		</button>
		<button
			class="flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-semibold transition-all {activeTab ===
			'reels'
				? 'bg-primary/20 text-primary'
				: 'text-muted-foreground hover:bg-black/5'}"
			onclick={() => (activeTab = 'reels')}
		>
			<div
				class="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full {activeTab ===
				'reels'
					? 'bg-primary text-white'
					: ''}"
			>
				<Film size={16} />
			</div>
			<span>Reels</span>
		</button>
	</div>

	<div class="no-scrollbar flex space-x-2 overflow-x-auto pb-2">
		<!-- Create Card -->
		<div
			class="glass-card group relative h-48 w-32 flex-shrink-0 cursor-pointer overflow-hidden rounded-xl transition-transform hover:scale-[1.02]"
			onclick={handleCreate}
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === 'Enter' && handleCreate()}
		>
			<div class="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
			{#if currentUser}
				<img
					src={currentUser.avatar || 'https://github.com/shadcn.png'}
					alt="Your Story"
					class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
				/>
				<div class="absolute bottom-0 left-0 right-0 flex flex-col items-center p-2">
					<div
						class="bg-primary relative -mt-6 mb-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-black/20 text-white shadow-lg"
					>
						<Plus size={16} strokeWidth={3} />
					</div>
					<span class="text-xs font-semibold text-white"
						>Create {activeTab === 'stories' ? 'Story' : 'Reel'}</span
					>
				</div>
			{/if}
		</div>

		{#if activeTab === 'stories'}
			<!-- Display FETCHED STORIES Grouped by User -->
			{#each storyGroups as group, i (group.user.id || i)}
				{@const previewStory = group.stories[0]}
				<div
					class="glass-card border-primary/20 group relative h-48 w-32 flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 p-[2px] transition-transform hover:scale-[1.02]"
					onclick={() => openViewer(i)}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && openViewer(i)}
				>
					<!-- Show the latest story (or first) as preview -->
					<div
						class="absolute inset-0 z-10 rounded-lg bg-gradient-to-b from-transparent to-black/60"
					></div>
					{#if previewStory.media_type === 'video'}
						<video
							src={previewStory.media_url}
							class="h-full w-full rounded-lg object-cover transition-transform duration-500 group-hover:scale-110"
							preload="metadata"
							muted
							playsinline
						></video>
					{:else}
						<img
							src={previewStory.media_url}
							alt="Story"
							class="h-full w-full rounded-lg object-cover transition-transform duration-500 group-hover:scale-110"
						/>
					{/if}
					<div
						class="border-primary absolute left-2 top-2 z-20 rounded-full border-2 bg-white p-[2px]"
					>
						<Avatar class="h-8 w-8 border border-gray-200">
							<AvatarImage src={group.user.avatar} />
							<AvatarFallback>{group.user.username?.[0]}</AvatarFallback>
						</Avatar>
					</div>
					<span
						class="absolute bottom-2 left-2 z-20 text-xs font-bold text-white shadow-black/50 drop-shadow-md"
					>
						{group.user.username}
					</span>
				</div>
			{/each}
		{:else}
			<!-- Display REELS (Flat Feed) -->
			{#each reels as reel (reel.id)}
				<div
					class="glass-card group relative h-60 w-36 flex-shrink-0 cursor-pointer overflow-hidden rounded-xl transition-transform hover:scale-[1.02]"
				>
					<div class="absolute inset-0 z-10 bg-gradient-to-b from-transparent to-black/60"></div>
					<img
						src={reel.thumbnail_url || 'https://via.placeholder.com/150'}
						alt="Reel"
						class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
					/>
					<div
						class="absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
					>
						<div class="rounded-full bg-black/40 p-2 backdrop-blur-sm">
							<Video size={24} class="text-white" />
						</div>
					</div>
					<div class="absolute bottom-2 left-2 z-20 flex flex-col">
						<span class="text-xs font-bold text-white shadow-black/50 drop-shadow-md"
							>{reel.author?.username}</span
						>
						<span class="line-clamp-1 text-[10px] text-white/80">{reel.views} views</span>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
