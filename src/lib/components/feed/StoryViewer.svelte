<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { X, ChevronLeft, ChevronRight, Volume2, VolumeX } from '@lucide/svelte';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { fade, scale } from 'svelte/transition';

	// Props
	let {
		storyGroups = [],
		initialGroupIndex = 0,
		onClose
	} = $props<{
		storyGroups: any[];
		initialGroupIndex: number;
		onClose: () => void;
	}>();

	// State
	let currentGroupIndex = $state(initialGroupIndex);
	let currentStoryIndex = $state(0);
	let progress = $state(0);
	let isPaused = $state(false);
	let isMuted = $state(false);
	let videoEl: HTMLVideoElement | undefined = $state();

	let currentGroup = $derived(storyGroups[currentGroupIndex]);
	let currentStory = $derived(currentGroup?.stories[currentStoryIndex]);

	let timer: any;
	const STORY_DURATION = 5000; // 5 seconds for images
	const TICK_RATE = 100;

	onMount(() => {
		startTimer();
	});

	onDestroy(() => {
		clearInterval(timer);
	});

	// Effect to reset/start timer when story changes
	$effect(() => {
		if (currentStory) {
			resetTimer();
		}
	});

	function resetTimer() {
		clearInterval(timer);
		progress = 0;

		if (currentStory && currentStory.media_type === 'video') {
			// Video handles its own progress via timeupdate
		} else {
			startTimer();
		}
	}

	function startTimer() {
		clearInterval(timer);
		timer = setInterval(() => {
			if (!isPaused) {
				progress += (TICK_RATE / STORY_DURATION) * 100;
				if (progress >= 100) {
					nextStory();
				}
			}
		}, TICK_RATE);
	}

	function nextStory() {
		if (currentStoryIndex < currentGroup.stories.length - 1) {
			currentStoryIndex++;
		} else {
			// End of this user's stories, go to next user
			if (currentGroupIndex < storyGroups.length - 1) {
				currentGroupIndex++;
				currentStoryIndex = 0;
			} else {
				onClose(); // End of all stories
			}
		}
	}

	function prevStory() {
		if (currentStoryIndex > 0) {
			currentStoryIndex--;
		} else {
			// Go to previous user
			if (currentGroupIndex > 0) {
				currentGroupIndex--;
				currentStoryIndex = storyGroups[currentGroupIndex].stories.length - 1; // Last story of prev user
			}
		}
	}

	function handleVideoTimeUpdate(e: Event) {
		const target = e.target as HTMLVideoElement;
		if (target.duration) {
			progress = (target.currentTime / target.duration) * 100;
		}
	}

	function handleVideoEnded() {
		nextStory();
	}
</script>

<!-- Backdrop -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black"
	transition:fade={{ duration: 200 }}
>
	<!-- Close Button -->
	<button class="absolute right-4 top-4 z-50 text-white hover:text-gray-300" onclick={onClose}>
		<X size={32} />
	</button>

	<!-- Desktop Navigation Arrows -->
	<button
		class="absolute left-4 z-40 hidden rounded-full bg-white/10 p-2 text-white/50 hover:text-white md:flex"
		onclick={prevStory}
	>
		<ChevronLeft size={32} />
	</button>
	<button
		class="absolute right-4 z-40 hidden rounded-full bg-white/10 p-2 text-white/50 hover:text-white md:flex"
		onclick={nextStory}
	>
		<ChevronRight size={32} />
	</button>

	<!-- Main Content Area -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative h-full w-full overflow-hidden bg-gray-900 md:h-[85vh] md:max-w-[400px] md:rounded-xl"
		onclick={(e) => {
			// Click left/right side logic
			const rect = e.currentTarget.getBoundingClientRect();
			const x = e.clientX - rect.left;
			if (x < rect.width / 3) prevStory();
			else nextStory();
		}}
	>
		<!-- Progress Bars -->
		<div class="absolute left-0 right-0 top-0 z-20 flex gap-1 p-2">
			{#if currentGroup}
				{#each currentGroup.stories as story, i}
					<div class="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
						<div
							class="h-full bg-white transition-all duration-100 ease-linear"
							style="width: {i < currentStoryIndex
								? '100%'
								: i === currentStoryIndex
									? `${progress}%`
									: '0%'}"
						></div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- User Info Header -->
		{#if currentGroup}
			<div class="absolute left-0 right-0 top-4 z-20 flex items-center justify-between px-4 pt-2">
				<div class="flex items-center gap-2">
					<Avatar class="h-8 w-8 border border-white/50">
						<AvatarImage src={currentGroup.user.avatar} />
						<AvatarFallback>{currentGroup.user.username?.[0]}</AvatarFallback>
					</Avatar>
					<div class="flex flex-col">
						<span class="text-sm font-semibold text-white shadow-black drop-shadow-md"
							>{currentGroup.user.username}</span
						>
						<!-- Optionally show timestamp here -->
					</div>
				</div>

				<!-- Controls -->
				<div class="flex gap-2">
					{#if currentStory && currentStory.media_type === 'video'}
						<button
							onclick={(e) => {
								e.stopPropagation();
								isMuted = !isMuted;
							}}
						>
							{#if isMuted}
								<VolumeX size={20} class="text-white" />
							{:else}
								<Volume2 size={20} class="text-white" />
							{/if}
						</button>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Media -->
		<div class="flex h-full w-full items-center justify-center bg-black">
			{#if currentStory}
				{#if currentStory.media_type === 'video'}
					<video
						src={currentStory.media_url}
						class="h-full w-full object-contain"
						autoplay
						muted={isMuted}
						playsinline
						onpause={() => (isPaused = true)}
						onplay={() => (isPaused = false)}
						ontimeupdate={handleVideoTimeUpdate}
						onended={handleVideoEnded}
						bind:this={videoEl}
					></video>
				{:else}
					<img
						src={currentStory.media_url}
						alt="Story"
						class="h-full w-full object-cover md:object-contain"
					/>
				{/if}
			{/if}
		</div>
	</div>
</div>
