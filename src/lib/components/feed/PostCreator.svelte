<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { apiRequest } from '$lib/api';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import { CustomSelect } from '$lib/components/ui/custom-select';
	import { X, Image as ImageIcon, Smile, MapPin, Tag, UserPlus } from '@lucide/svelte';
	import UserMentionDropdown from './UserMentionDropdown.svelte';

	const dispatch = createEventDispatcher();

	type MediaItem = {
		file: File;
		previewUrl: string;
		type: 'image' | 'video';
	};

	type User = {
		id: string;
		username: string;
		avatar?: string;
	};

	let postContent: string = '';
	let mediaItems: MediaItem[] = [];
	let privacy: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME' = 'PUBLIC';
	let submitting: boolean = false;
	let fileInput: HTMLInputElement;

	// Rich Features State
	let location: string = '';
	let showLocationInput = false;
	let showEmojiPicker = false;
	let showUserTagger = false;
	let taggedUsers: User[] = [];
	let userSearchQuery = '';

	let emojiPickerContainer: HTMLElement;
	let emojiToggleButton: HTMLElement;

	onMount(async () => {
		if (typeof window !== 'undefined') {
			await import('emoji-picker-element');
		}
	});

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files) {
			addFiles(Array.from(input.files));
		}
		input.value = '';
	}

	function addFiles(files: File[]) {
		files.forEach((file) => {
			const match = file.type.match(/^(image|video)\//);
			if (match) {
				const type = match[1] as 'image' | 'video';
				const previewUrl = URL.createObjectURL(file);
				mediaItems = [...mediaItems, { file, previewUrl, type }];
			} else {
				alert(`File type ${file.type} not supported`);
			}
		});
	}

	function removeMedia(index: number) {
		URL.revokeObjectURL(mediaItems[index].previewUrl);
		mediaItems = mediaItems.filter((_, i) => i !== index);
	}

	function onEmojiSelect(event: any) {
		// emoji-picker-element emits 'emoji-click' with detail: { unicode: '...', ... }
		if (event.detail && event.detail.unicode) {
			postContent += event.detail.unicode;
		}
		showEmojiPicker = false;
	}

	function toggleEmojiPicker() {
		showEmojiPicker = !showEmojiPicker;
	}

	function setupEmojiPicker(node: HTMLElement) {
		const handleEmojiClick = (event: any) => onEmojiSelect(event);
		node.addEventListener('emoji-click', handleEmojiClick);
		return {
			destroy() {
				node.removeEventListener('emoji-click', handleEmojiClick);
			}
		};
	}

	function handleWindowClick(event: MouseEvent) {
		if (!showEmojiPicker) return;

		if (
			emojiPickerContainer &&
			!emojiPickerContainer.contains(event.target as Node) &&
			emojiToggleButton &&
			!emojiToggleButton.contains(event.target as Node)
		) {
			showEmojiPicker = false;
		}
	}

	function toggleLocation() {
		showLocationInput = !showLocationInput;
		if (!showLocationInput) location = '';
	}

	function toggleUserTagger() {
		showUserTagger = !showUserTagger;
		if (!showUserTagger) {
			userSearchQuery = '';
		}
	}

	function addUserTag(user: User) {
		if (!taggedUsers.find((u) => u.id === user.id)) {
			taggedUsers = [...taggedUsers, user];
		}
		userSearchQuery = '';
		showUserTagger = false;
	}

	function removeUserTag(userId: string) {
		taggedUsers = taggedUsers.filter((u) => u.id !== userId);
	}

	async function handleSubmit() {
		if (!postContent.trim() && mediaItems.length === 0) {
			alert('Post content or media cannot be empty.');
			return;
		}

		submitting = true;

		try {
			const formData = new FormData();
			formData.append('content', postContent.trim());
			formData.append('privacy', privacy);
			if (location) formData.append('location', location);

			mediaItems.forEach((item) => {
				formData.append('files[]', item.file);
			});

			taggedUsers.forEach((user) => {
				formData.append('mentions[]', user.id);
			});

			const newPost = await apiRequest('POST', '/feed/posts', formData);

			if (!newPost.comments) {
				newPost.comments = [];
			}

			mediaItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));

			postContent = '';
			mediaItems = [];
			location = '';
			taggedUsers = [];
			showLocationInput = false;
			privacy = 'PUBLIC';
			dispatch('postCreated', newPost);
		} catch (err: any) {
			console.error('Create post error:', err);
			alert(err.message || 'Failed to create post.');
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:window on:click={handleWindowClick} />

<Card
	class="relative w-full overflow-visible rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
>
	<CardContent class="space-y-4 p-4">
		<!-- Input Area -->
		<div class="flex items-start space-x-3">
			<div class="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700"></div>
			<div class="flex-grow space-y-2">
				<div class="relative">
					<Textarea
						placeholder="What's on your mind?"
						bind:value={postContent}
						rows={mediaItems.length > 0 ? 2 : 3}
						class="w-full resize-none border-none bg-transparent p-0 text-lg placeholder:text-gray-500 focus-visible:ring-0"
						disabled={submitting}
					/>
					{#if showEmojiPicker}
						<div
							class="absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
							bind:this={emojiPickerContainer}
						>
							<emoji-picker use:setupEmojiPicker class="light"></emoji-picker>
						</div>
					{/if}
				</div>

				<!-- Tagged Users & Location Display -->
				{#if taggedUsers.length > 0 || location}
					<div class="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-300">
						{#if location}
							<span class="flex items-center rounded-md bg-gray-100 px-2 py-1 dark:bg-gray-700">
								<MapPin size={14} class="mr-1 text-red-500" />
								{location}
								<button onclick={() => (location = '')} class="ml-2 hover:text-red-500"
									><X size={12} /></button
								>
							</span>
						{/if}
						{#each taggedUsers as user}
							<span
								class="flex items-center rounded-md bg-blue-50 px-2 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
							>
								<span class="mr-1">@</span>{user.username}
								<button onclick={() => removeUserTag(user.id)} class="ml-2 hover:text-blue-500"
									><X size={12} /></button
								>
							</span>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Media Previews -->
		{#if mediaItems.length > 0}
			<div class="mt-4 overflow-x-auto pb-2">
				<div class="flex w-max space-x-3">
					{#each mediaItems as item, index}
						<div
							class="group relative aspect-square h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-black shadow-sm md:h-40 md:w-40 dark:border-gray-700"
						>
							{#if item.type === 'image'}
								<img src={item.previewUrl} alt="Preview" class="h-full w-full object-cover" />
							{:else}
								<video src={item.previewUrl} class="h-full w-full object-cover" controls></video>
							{/if}
							<button
								onclick={() => removeMedia(index)}
								class="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity hover:bg-black group-hover:opacity-100"
							>
								<X size={14} />
							</button>
						</div>
					{/each}
					{#if mediaItems.length < 10}
						<button
							class="flex h-32 w-32 flex-shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-500 transition-colors hover:bg-gray-50 md:h-40 md:w-40 dark:border-gray-600 dark:hover:bg-gray-800/50"
							onclick={() => fileInput.click()}
						>
							<ImageIcon size={24} class="mb-2 opacity-50" />
							<span class="text-xs font-medium">Add Photos</span>
						</button>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Feature Inputs (Location / User Search) -->
		{#if showLocationInput}
			<div
				class="animate-in fade-in slide-in-from-top-1 flex items-center space-x-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50"
			>
				<MapPin size={18} class="text-red-500" />
				<input
					type="text"
					placeholder="Where are you?"
					bind:value={location}
					class="w-full border-none bg-transparent text-sm focus:ring-0"
					autoFocus
				/>
			</div>
		{/if}

		{#if showUserTagger}
			<div
				class="animate-in fade-in slide-in-from-top-1 relative rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50"
			>
				<div class="flex items-center space-x-2">
					<UserPlus size={18} class="text-blue-500" />
					<input
						type="text"
						placeholder="Search for friends to tag..."
						bind:value={userSearchQuery}
						class="w-full border-none bg-transparent text-sm focus:ring-0"
						autoFocus
					/>
				</div>
				{#if userSearchQuery}
					<div class="absolute left-0 top-full z-10 mt-1 w-full">
						<UserMentionDropdown query={userSearchQuery} onSelection={addUserTag} />
					</div>
				{/if}
			</div>
		{/if}

		<div
			class="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700"
		>
			<!-- Add to Post Actions -->
			<div class="flex items-center space-x-2">
				<p class="mr-2 hidden text-sm font-semibold text-gray-900 sm:block dark:text-gray-200">
					Add to your post
				</p>

				<input
					type="file"
					multiple
					accept="image/*,video/*"
					class="hidden"
					bind:this={fileInput}
					onchange={handleFileSelect}
				/>

				<div class="flex items-center space-x-1">
					<Button
						variant="ghost"
						size="icon"
						class="rounded-full text-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20"
						onclick={() => fileInput.click()}
					>
						<ImageIcon size={20} />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						class="rounded-full text-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
						onclick={toggleUserTagger}
					>
						<Tag size={20} />
					</Button>
					<span bind:this={emojiToggleButton}>
						<Button
							variant="ghost"
							size="icon"
							class="rounded-full text-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20"
							onclick={toggleEmojiPicker}
						>
							<Smile size={20} />
						</Button>
					</span>
					<Button
						variant="ghost"
						size="icon"
						class="rounded-full text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
						onclick={toggleLocation}
					>
						<MapPin size={20} />
					</Button>
				</div>
			</div>

			<!-- Privacy & Submit -->
			<div class="flex items-center space-x-3">
				<CustomSelect
					bind:value={privacy}
					options={[
						{ value: 'PUBLIC', label: 'Public' },
						{ value: 'FRIENDS', label: 'Friends' },
						{ value: 'ONLY_ME', label: 'Only Me' }
					]}
					placeholder="Privacy"
					disabled={submitting}
					style="w-[110px]"
				/>
				<Button
					onclick={handleSubmit}
					disabled={submitting || (!postContent.trim() && mediaItems.length === 0)}
					class="min-w-[80px]"
				>
					{submitting ? 'Posting...' : 'Post'}
				</Button>
			</div>
		</div>
	</CardContent>
</Card>
