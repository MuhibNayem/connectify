<script lang="ts">
	import { page } from '$app/stores';
	import { apiRequest, uploadFiles, updateUserProfile } from '$lib/api';
	import { auth } from '$lib/stores/auth.svelte';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import PostCard from '$lib/components/feed/PostCard.svelte';

	let userId = $state('');
	let user = $state<any | null>(null);
	let posts = $state<any[]>([]);
	let loadingUser = $state(true);
	let loadingPosts = $state(true);
	let userError = $state<string | null>(null);
	let postsError = $state<string | null>(null);
	let friendshipStatus = $state<'none' | 'pending' | 'friends' | 'blocked'>('none');
	let sendingRequest = $state(false);
	let isCurrentUser = $state(false);

	// File Inputs
	let avatarInput: HTMLInputElement;
	let coverInput: HTMLInputElement;
	let isUploading = $state(false);

	async function sendFriendRequest() {
		sendingRequest = true;
		try {
			await apiRequest('POST', '/friendships/requests', { receiver_id: userId });
			friendshipStatus = 'pending';
		} catch (err: any) {
			console.error('Failed to send friend request:', err);
		} finally {
			sendingRequest = false;
		}
	}

	$effect(() => {
		userId = $page.params.id ?? '';
		if (userId) {
			isCurrentUser = auth.state.user?.id === userId;
			fetchUserProfile(userId);
			fetchUserPosts(userId);
		}
	});

	async function handleFileChange(type: 'avatar' | 'cover', event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		const file = input.files[0];
		isUploading = true;

		try {
			// 1. Upload File
			const uploadResult = await uploadFiles([file]);
			if (!uploadResult || uploadResult.length === 0) throw new Error('Upload failed');

			const fileUrl = uploadResult[0].url;

			// 2. Update User Profile
			const payload: any = {};
			if (type === 'avatar') payload.avatar = fileUrl;
			if (type === 'cover') payload.cover_picture = fileUrl;

			const updatedUser = await updateUserProfile(payload);

			// 3. Update Local State
			user = { ...user, ...payload };
			if (isCurrentUser) {
				auth.updateUser(updatedUser);
			}
		} catch (error) {
			console.error(`Failed to update ${type}:`, error);
		} finally {
			isUploading = false;
			// Reset input
			input.value = '';
		}
	}

	async function fetchUserProfile(id: string) {
		loadingUser = true;
		userError = null;
		try {
			user = await apiRequest('GET', `/users/${id}`);

			// Friendship check only if not current user
			if (!isCurrentUser && auth.state.isAuthenticated) {
				try {
					const friendshipCheck = await apiRequest('GET', `/friendships/check?other_user_id=${id}`);
					if (friendshipCheck.are_friends) {
						friendshipStatus = 'friends';
					} else if (friendshipCheck.RequestSent) {
						friendshipStatus = 'pending';
					} else if (friendshipCheck.IsBlockedByViewer || friendshipCheck.HasBlockedViewer) {
						friendshipStatus = 'blocked';
					} else if (friendshipCheck.RequestReceived) {
						friendshipStatus = 'pending';
					} else {
						friendshipStatus = 'none';
					}
				} catch (err: any) {
					console.warn('Could not check friendship status:', err);
				}
			}
		} catch (err: any) {
			userError = err.message || 'Failed to fetch user profile.';
		} finally {
			loadingUser = false;
		}
	}

	async function fetchUserPosts(id: string) {
		loadingPosts = true;
		postsError = null;
		try {
			const response = await apiRequest('GET', `/posts?user_id=${id}`);
			posts = response.posts || [];
		} catch (err: any) {
			postsError = err.message || 'Failed to fetch user posts.';
		} finally {
			loadingPosts = false;
		}
	}
</script>

<div class="container mx-auto p-4">
	{#if loadingUser}
		<p>Loading user profile...</p>
	{:else if userError}
		<p class="text-red-500">Error: {userError}</p>
	{:else if user}
		<Card class="mb-6 overflow-hidden">
			<!-- Cover Picture Region -->
			<div class="group relative h-48 w-full bg-gray-200 md:h-64">
				{#if user.cover_picture}
					<img src={user.cover_picture} alt="Cover" class="h-full w-full object-cover" />
				{:else}
					<div
						class="flex h-full w-full items-center justify-center bg-gradient-to-r from-gray-100 to-gray-200 text-gray-400"
					>
						No Cover Photo
					</div>
				{/if}

				{#if isCurrentUser}
					<button
						class="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 font-medium text-white opacity-0 transition group-hover:opacity-100"
						onclick={() => coverInput.click()}
						disabled={isUploading}
					>
						Change Cover
					</button>
					<input
						type="file"
						accept="image/*"
						bind:this={coverInput}
						onchange={(e) => handleFileChange('cover', e)}
						hidden
					/>
				{/if}
			</div>

			<CardContent class="relative flex flex-col items-center p-6 pt-0 md:flex-row md:pt-0">
				<!-- Avatar with overlap -->
				<div class="group relative -mt-16 mb-4 flex-shrink-0 md:mb-0 md:mr-6">
					<Avatar class="h-32 w-32 border-4 border-white bg-white shadow-lg md:h-40 md:w-40">
						<AvatarImage
							src={user.avatar || 'https://github.com/shadcn.png'}
							alt={user.username}
							class="object-cover"
						/>
						<AvatarFallback class="text-4xl"
							>{user.username?.charAt(0).toUpperCase()}</AvatarFallback
						>
					</Avatar>

					{#if isCurrentUser}
						<button
							class="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100"
							onclick={() => avatarInput.click()}
							disabled={isUploading}
						>
							Edit
						</button>
						<input
							type="file"
							accept="image/*"
							bind:this={avatarInput}
							onchange={(e) => handleFileChange('avatar', e)}
							hidden
						/>
					{/if}
				</div>

				<div class="mt-4 flex-grow text-center md:mt-6 md:text-left">
					<div class="flex flex-col justify-between md:flex-row md:items-center">
						<div>
							<h1 class="text-3xl font-bold">{user.full_name || user.username}</h1>
							{#if user.full_name}<p class="text-lg text-gray-600">@{user.username}</p>{/if}
						</div>
						{#if isCurrentUser}
							<a
								href="/settings"
								class="mt-2 rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-200 md:mt-0"
							>
								Edit Profile
							</a>
						{/if}
					</div>

					{#if user.bio}<p class="mt-2 max-w-2xl text-gray-700">{user.bio}</p>{/if}

					<div class="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
						{#if user.location}<span>📍 {user.location}</span>{/if}
						{#if user.website}<span>🔗 {user.website}</span>{/if}
						<span>📅 Joined {new Date(user.created_at).toLocaleDateString()}</span>
					</div>

					<div class="mt-6 flex justify-center space-x-4 md:justify-start">
						{#if !isCurrentUser}
							{#if friendshipStatus === 'none'}
								<Button variant="outline" onclick={sendFriendRequest} disabled={sendingRequest}>
									{sendingRequest ? 'Sending...' : 'Add Friend'}
								</Button>
							{:else if friendshipStatus === 'pending'}
								<Button variant="outline" disabled>Friend Request Sent</Button>
							{:else if friendshipStatus === 'friends'}
								<Button variant="outline" disabled>Friends</Button>
							{:else if friendshipStatus === 'blocked'}
								<Button variant="destructive" disabled>Blocked</Button>
							{/if}
							<Button>Message</Button>
						{/if}
					</div>
				</div>
			</CardContent>
		</Card>

		<Tabs value="posts" class="w-full">
			<TabsList class="grid w-full grid-cols-2">
				<TabsTrigger value="posts">Posts</TabsTrigger>
				<TabsTrigger value="friends">Friends</TabsTrigger>
			</TabsList>
			<TabsContent value="posts" class="mt-4">
				<h2 class="mb-4 text-2xl font-bold">Posts by {user.username}</h2>
				{#if loadingPosts}
					<p>Loading posts...</p>
				{:else if postsError}
					<p class="text-red-500">Error: {postsError}</p>
				{:else if posts.length === 0}
					<p>No posts found for {user.username}.</p>
				{:else}
					<div class="space-y-4">
						{#each posts as post (post.id)}
							<PostCard {post} />
						{/each}
					</div>
				{/if}
			</TabsContent>
			<TabsContent value="friends" class="mt-4">
				<h2 class="mb-4 text-2xl font-bold">Friends of {user.username}</h2>
				<p>Friends list coming soon...</p>
				<!-- You would fetch and display friends here -->
			</TabsContent>
		</Tabs>
	{:else}
		<p>User not found.</p>
	{/if}
</div>
