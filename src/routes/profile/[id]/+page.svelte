<script lang="ts">
	import { page } from '$app/stores';
	import { apiRequest, uploadFiles, updateUserProfile } from '$lib/api';
	import { auth } from '$lib/stores/auth.svelte';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import PostCard from '$lib/components/feed/PostCard.svelte';
	import PostCreator from '$lib/components/feed/PostCreator.svelte';
	import { Camera, MapPin, Link as LinkIcon, Calendar, MoreHorizontal } from '@lucide/svelte';

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
	let activeTab = $state('posts');
	let friends = $state<any[]>([]);
	let loadingFriends = $state(false);

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
			fetchUserFriends(userId);
			activeTab = 'posts'; // Reset tab on navigation
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
			if (!isCurrentUser && auth.state.user) {
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

	async function fetchUserFriends(id: string) {
		loadingFriends = true;
		try {
			// Fetch accepted friendships for this user
			const response = await apiRequest('GET', `/friendships?user_id=${id}&status=accepted`);
			const acceptedFriendships: any[] = response.data;

			if (!acceptedFriendships) {
				friends = [];
				return;
			}

			// Fetch details for each friend
			const friendUserPromises = acceptedFriendships.map(async (friendship) => {
				const friendId =
					friendship.requester_id === id ? friendship.receiver_id : friendship.requester_id;

				try {
					const friendDetails = await apiRequest('GET', `/users/${friendId}`);
					return {
						id: friendDetails.id,
						username: friendDetails.username,
						avatar: friendDetails.avatar,
						full_name: friendDetails.full_name
					};
				} catch (e) {
					return null;
				}
			});

			const results = await Promise.all(friendUserPromises);
			friends = results.filter((f) => f !== null);
		} catch (err) {
			console.error('Failed to fetch friends', err);
		} finally {
			loadingFriends = false;
		}
	}

	function handlePostCreated(event: CustomEvent) {
		posts = [event.detail, ...posts];
	}
</script>

{#if loadingUser}
	<div class="flex h-[50vh] items-center justify-center">
		<div
			class="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
		></div>
	</div>
{:else if userError}
	<div class="container mx-auto p-4 text-center">
		<p class="text-red-500">Error: {userError}</p>
		<Button href="/" variant="link">Go Home</Button>
	</div>
{:else if user}
	<div class="bg-card pb-4 shadow-sm">
		<div class="mx-auto max-w-[1095px]">
			<!-- Cover Photo -->
			<div class="relative h-[350px] w-full overflow-hidden rounded-b-xl bg-gray-200 md:h-[400px]">
				{#if user.cover_picture}
					<img src={user.cover_picture} alt="Cover" class="h-full w-full object-cover" />
				{:else}
					<div
						class="flex h-full w-full items-center justify-center bg-gradient-to-r from-gray-100 to-gray-200 text-gray-400"
					></div>
				{/if}

				{#if isCurrentUser}
					<button
						class="absolute bottom-4 right-4 flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-black shadow-sm hover:bg-gray-100"
						onclick={() => coverInput.click()}
						disabled={isUploading}
					>
						<Camera size={18} />
						<span>Edit cover photo</span>
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

			<!-- Profile Info Header -->
			<div class="mx-auto max-w-[1030px] px-4 pb-4">
				<div class="relative flex flex-col items-center md:flex-row md:items-end md:gap-6">
					<!-- Avatar -->
					<div class="relative -mt-20 md:-mt-8">
						<div class="bg-card relative rounded-full p-1">
							<Avatar class="border-card h-[168px] w-[168px] border-4 bg-white object-cover">
								<AvatarImage
									src={user.avatar || 'https://github.com/shadcn.png'}
									alt={user.username}
									class="object-cover"
								/>
								<AvatarFallback class="text-6xl"
									>{user.username?.charAt(0).toUpperCase()}</AvatarFallback
								>
							</Avatar>
							{#if isCurrentUser}
								<button
									class="border-card absolute bottom-2 right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 bg-gray-200 text-black hover:bg-gray-300"
									onclick={() => avatarInput.click()}
									disabled={isUploading}
								>
									<Camera size={20} />
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
					</div>

					<!-- Info -->
					<div class="mb-4 mt-2 flex-grow text-center md:mb-8 md:mt-0 md:text-left">
						<h1 class="text-3xl font-bold">{user.full_name || user.username}</h1>
						{#if user.full_name}<p class="text-muted-foreground font-semibold">
								@{user.username}
							</p>{/if}
						{#if user.bio}
							<p class="text-muted-foreground mx-auto mt-1 max-w-md md:mx-0">{user.bio}</p>
						{/if}

						{#if friendshipStatus === 'friends'}
							<p class="text-muted-foreground mt-1 text-sm font-semibold">
								{friends.length} friends
							</p>
						{/if}
					</div>

					<!-- Actions -->
					<div class="mb-8 flex flex-col gap-2 md:flex-row">
						{#if !isCurrentUser}
							{#if friendshipStatus === 'none'}
								<Button onclick={sendFriendRequest} disabled={sendingRequest}>
									{sendingRequest ? 'Sending...' : 'Add Friend'}
								</Button>
							{:else if friendshipStatus === 'pending'}
								<Button variant="secondary" disabled>Request Sent</Button>
							{:else if friendshipStatus === 'friends'}
								<Button variant="secondary">Friends</Button>
							{:else if friendshipStatus === 'blocked'}
								<Button variant="destructive" disabled>Blocked</Button>
							{/if}
							<Button variant="secondary">Message</Button>
						{:else}
							<Button variant="secondary" class="bg-secondary/50 font-semibold" href="/settings">
								<div class="mr-2">✏️</div>
								Edit profile
							</Button>
						{/if}
					</div>
				</div>

				<hr class="border-border/40 my-1" />

				<!-- Navigation Tabs -->
				<div class="flex items-center gap-1 overflow-x-auto py-1">
					<Button
						variant="ghost"
						class={`hover:bg-secondary/50 h-12 rounded-lg px-4 font-semibold ${activeTab === 'posts' ? 'text-primary border-primary rounded-none border-b-2' : 'text-muted-foreground'}`}
						onclick={() => (activeTab = 'posts')}
					>
						Posts
					</Button>
					<Button
						variant="ghost"
						class={`hover:bg-secondary/50 h-12 rounded-lg px-4 font-semibold ${activeTab === 'about' ? 'text-primary border-primary rounded-none border-b-2' : 'text-muted-foreground'}`}
						onclick={() => (activeTab = 'about')}
					>
						About
					</Button>
					<Button
						variant="ghost"
						class={`hover:bg-secondary/50 h-12 rounded-lg px-4 font-semibold ${activeTab === 'friends' ? 'text-primary border-primary rounded-none border-b-2' : 'text-muted-foreground'}`}
						onclick={() => (activeTab = 'friends')}
					>
						Friends
					</Button>
					<Button
						variant="ghost"
						class={`hover:bg-secondary/50 h-12 rounded-lg px-4 font-semibold ${activeTab === 'photos' ? 'text-primary border-primary rounded-none border-b-2' : 'text-muted-foreground'}`}
						onclick={() => (activeTab = 'photos')}
					>
						Photos
					</Button>
					<Button
						variant="ghost"
						class="text-muted-foreground hover:bg-secondary/50 flex h-12 items-center gap-1 rounded-lg px-4 font-semibold"
					>
						More <MoreHorizontal size={16} />
					</Button>
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="mx-auto max-w-[1095px] px-4 py-4">
		{#if activeTab === 'posts'}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-12">
				<!-- Left Sidebar (Intro, Photos, Friends) -->
				<div class="space-y-4 md:col-span-5">
					<!-- Intro Card -->
					<div class="glass-card bg-card rounded-xl border border-white/5 p-4 shadow-sm">
						<h2 class="mb-4 text-xl font-bold">Intro</h2>
						{#if user.bio}
							<div class="mb-4 text-center">
								<p class="text-sm">{user.bio}</p>
							</div>
						{/if}
						<div class="mb-4 space-y-3">
							{#if user.location}
								<div class="text-muted-foreground flex items-center gap-2">
									<MapPin size={20} />
									<span
										>Lives in <span class="text-foreground font-semibold">{user.location}</span
										></span
									>
								</div>
							{/if}
							{#if user.website}
								<div class="text-muted-foreground flex items-center gap-2">
									<LinkIcon size={20} />
									<a
										href={user.website}
										target="_blank"
										class="truncate text-blue-500 hover:underline">{user.website}</a
									>
								</div>
							{/if}
							<div class="text-muted-foreground flex items-center gap-2">
								<Calendar size={20} />
								<span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
							</div>
						</div>

						<Button variant="secondary" class="bg-secondary/50 mb-3 w-full font-semibold"
							>Edit details</Button
						>
					</div>

					<!-- Photos Widget (Mock) -->
					<div class="glass-card bg-card rounded-xl border border-white/5 p-4 shadow-sm">
						<div class="mb-2 flex items-center justify-between">
							<h2 class="text-xl font-bold">Photos</h2>
							<Button variant="link" class="text-primary p-0" onclick={() => (activeTab = 'photos')}
								>See all photos</Button
							>
						</div>
						<div class="grid grid-cols-3 gap-1 overflow-hidden rounded-lg">
							<!-- Mock Photos -->
							<div class="bg-secondary aspect-square rounded-sm"></div>
							<div class="bg-secondary aspect-square rounded-sm"></div>
							<div class="bg-secondary aspect-square rounded-sm"></div>
						</div>
					</div>

					<!-- Friends Widget -->
					<div class="glass-card bg-card rounded-xl border border-white/5 p-4 shadow-sm">
						<div class="mb-2 flex items-center justify-between">
							<h2 class="text-xl font-bold">Friends</h2>
							<Button
								variant="link"
								class="text-primary p-0"
								onclick={() => (activeTab = 'friends')}>See all friends</Button
							>
						</div>
						<div class="text-muted-foreground mb-1 text-sm">{friends.length} friends</div>
						<div class="grid grid-cols-3 gap-2">
							{#each friends.slice(0, 9) as friend}
								<a href="/profile/{friend.id}" class="group">
									<div class="bg-secondary mb-1 aspect-square overflow-hidden rounded-lg">
										{#if friend.avatar}
											<img
												src={friend.avatar}
												alt={friend.username}
												class="h-full w-full object-cover transition group-hover:scale-105"
											/>
										{:else}
											<div class="flex h-full w-full items-center justify-center text-xs">👤</div>
										{/if}
									</div>
									<div class="truncate text-[11px] font-semibold group-hover:underline">
										{friend.full_name || friend.username}
									</div>
								</a>
							{/each}
							{#if friends.length === 0 && !loadingFriends}
								<div class="text-muted-foreground col-span-3 py-4 text-center text-xs">
									No friends found
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Right Feed -->
				<div class="space-y-4 md:col-span-7">
					{#if isCurrentUser}
						<div class="mb-4">
							<PostCreator on:postCreated={handlePostCreated} communityId="" />
						</div>
					{/if}

					<!-- Filters Widget -->
					<div
						class="glass-card bg-card flex items-center justify-between rounded-xl border border-white/5 p-4 shadow-sm"
					>
						<h3 class="text-lg font-bold">Posts</h3>
						<div class="flex gap-2">
							<Button variant="secondary" size="sm" class="bg-secondary/50"
								><div class="mr-1">⚙️</div>
								Filters</Button
							>
							<Button variant="secondary" size="sm" class="bg-secondary/50"
								><div class="mr-1">⚙️</div>
								Manage posts</Button
							>
						</div>
					</div>

					{#if loadingPosts}
						<div class="space-y-4">
							<!-- Skeleton Loaders -->
							<div class="bg-card h-40 animate-pulse rounded-xl"></div>
							<div class="bg-card h-40 animate-pulse rounded-xl"></div>
						</div>
					{:else if postsError}
						<p class="text-red-500">Error: {postsError}</p>
					{:else if posts.length === 0}
						<div
							class="glass-card bg-card rounded-xl border border-white/5 p-8 text-center shadow-sm"
						>
							<h3 class="mb-2 text-xl font-bold">No posts available</h3>
							<p class="text-muted-foreground">This user hasn't posted anything yet.</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each posts as post (post.id)}
								<PostCard {post} />
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{:else if activeTab === 'friends'}
			<div class="glass-card bg-card rounded-xl border border-white/5 p-4 shadow-sm">
				<h2 class="mb-4 text-2xl font-bold">Friends</h2>

				{#if loadingFriends}
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#each Array(6) as _}
							<div class="bg-secondary/50 h-24 animate-pulse rounded-xl"></div>
						{/each}
					</div>
				{:else if friends.length === 0}
					<div class="text-muted-foreground p-8 text-center">No friends found.</div>
				{:else}
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						{#each friends as friend}
							<div
								class="bg-secondary/10 hover:bg-secondary/20 flex items-center justify-between rounded-xl border border-white/5 p-4 transition"
							>
								<a href="/profile/{friend.id}" class="flex items-center gap-3">
									<div class="bg-secondary h-20 w-20 overflow-hidden rounded-lg">
										{#if friend.avatar}
											<img
												src={friend.avatar}
												alt={friend.username}
												class="h-full w-full object-cover"
											/>
										{:else}
											<div class="flex h-full w-full items-center justify-center">👤</div>
										{/if}
									</div>
									<div>
										<h3 class="text-lg font-bold hover:underline">
											{friend.full_name || friend.username}
										</h3>
										<p class="text-muted-foreground text-sm">@{friend.username}</p>
									</div>
								</a>
								<Button variant="secondary">Friend</Button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<div class="glass-card bg-card rounded-xl border border-white/5 p-8 text-center shadow-sm">
				<h2 class="mb-2 text-2xl font-bold capitalize">{activeTab}</h2>
				<p class="text-muted-foreground">This section is coming soon.</p>
			</div>
		{/if}
	</div>
{:else}
	<p>User not found.</p>
{/if}
