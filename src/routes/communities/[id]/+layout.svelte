<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getCommunity, joinCommunity, leaveCommunity, type Community } from '$lib/api';
	import { auth } from '$lib/stores/auth.svelte';
	import {
		Users,
		Shield,
		Settings,
		FileText,
		Share2,
		MoreHorizontal,
		Check,
		Search,
		Plus,
		Globe
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import Skeleton from '$lib/components/ui/skeleton/Skeleton.svelte';

	let community = $state<Community | null>(null);
	let loading = $state(true);
	let id = $derived($page.params.id);
	let showLeaveMenu = $state(false);

	// Tab configuration (Dynamic based on logic)
	let tabs = $derived.by(() => {
		const baseTabs = [
			{ name: 'Discussion', href: `/communities/${id}`, icon: FileText },
			{ name: 'Deals', href: `/communities/${id}/deals`, icon: FileText }, // Placeholder for now
			{ name: 'People', href: `/communities/${id}/members`, icon: Users },
			{ name: 'About', href: `/communities/${id}/about`, icon: Shield }
		];
		if (community?.is_admin) {
			baseTabs.push({ name: 'Settings', href: `/communities/${id}/settings`, icon: Settings });
		}
		return baseTabs;
	});

	async function loadCommunity() {
		try {
			loading = true;
			community = await getCommunity(id);
		} catch (error) {
			console.error('Error loading community:', error);
		} finally {
			loading = false;
		}
	}

	async function handleJoin() {
		if (!community) return;
		try {
			await joinCommunity(community.id);
			if (community.privacy === 'closed' && community.settings.require_join_approval) {
				community.is_pending = true;
			} else {
				community.is_member = true;
				community.stats.member_count++;
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function handleLeave() {
		if (!community) return;
		if (!confirm('Are you sure you want to leave this community?')) return;
		try {
			await leaveCommunity(community.id);
			community.is_member = false;
			community.is_admin = false;
			community.stats.member_count--;
		} catch (e) {
			console.error(e);
		}
	}

	onMount(() => {
		loadCommunity();
	});
</script>

{#if loading}
	<div class="bg-background h-screen w-full">
		<div class="mx-auto max-w-6xl px-4 pt-4">
			<Skeleton class="h-80 w-full rounded-b-xl" />
			<div class="mt-8 space-y-4">
				<Skeleton class="h-10 w-1/3 rounded-lg" />
				<Skeleton class="h-4 w-1/4 rounded-lg" />
			</div>
		</div>
	</div>
{:else if community}
	<div class="bg-background min-h-screen font-sans">
		<!-- Main Header Container (Cover + Info) -->
		<div class="bg-background border-border/40 border-b pb-0 pt-0 shadow-sm md:pt-4">
			<div class="container mx-auto max-w-6xl px-0 md:px-4">
				<!-- Cover Image -->
				<div class="relative h-[250px] w-full overflow-hidden md:h-[400px] md:rounded-b-xl">
					{#if community.cover_image}
						<img
							src={community.cover_image}
							alt={community.name}
							class="h-full w-full object-cover"
						/>
					{:else}
						<div class="h-full w-full bg-gradient-to-b from-blue-600 to-blue-800"></div>
					{/if}

					<!-- Edit Cover Button placeholder (if admin) -->
					{#if community.is_admin}
						<!-- <Button class="absolute bottom-4 right-4 bg-white text-black hover:bg-gray-100"><Camera size={18} class="mr-2"/> Edit Cover Photo</Button> -->
					{/if}
				</div>

				<!-- Group Info Section -->
				<div class="px-4 pb-4 pt-6 md:px-8">
					<div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
						<!-- Name & Stats -->
						<div class="flex-1">
							<h1 class="text-foreground text-3xl font-bold md:text-4xl lg:text-5xl">
								{community.name}
							</h1>
							<div class="text-muted-foreground mt-2 flex items-center gap-2 text-sm font-medium">
								{#if community.privacy === 'public'}
									<div class="flex items-center gap-1">
										<Globe size={16} /> Public group
									</div>
								{:else}
									<div class="flex items-center gap-1">
										<Shield size={16} /> Private group
									</div>
								{/if}
								<span>•</span>
								<span class="text-foreground font-bold">{community.stats.member_count}</span> members
							</div>
						</div>

						<!-- Action Buttons -->
						<div class="flex items-center gap-2">
							{#if community.is_member}
								<Button
									class="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 gap-2"
									variant="outline"
								>
									<Plus size={18} /> Invite
								</Button>
								<Button
									class="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 gap-2"
									variant="outline"
								>
									<Share2 size={18} />
								</Button>
								<div class="relative">
									<Button
										variant="secondary"
										class="text-foreground bg-secondary hover:bg-secondary/80 gap-2"
										onclick={() => (showLeaveMenu = !showLeaveMenu)}
									>
										<Check size={18} /> Joined
									</Button>
									{#if showLeaveMenu}
										<div class="glass-card absolute right-0 z-50 mt-2 w-48 p-1">
											<button
												class="w-full rounded-md px-4 py-2 text-left text-sm text-red-500 hover:bg-red-500/10"
												onclick={handleLeave}
											>
												Leave group
											</button>
										</div>
									{/if}
								</div>
							{:else}
								<Button
									onclick={handleJoin}
									class="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700 md:w-auto"
								>
									<Users size={18} /> Join Group
								</Button>
							{/if}

							<Button variant="secondary" size="icon" class="bg-secondary hover:bg-secondary/80">
								<MoreHorizontal size={20} />
							</Button>
						</div>
					</div>

					<hr class="mt-6 border-white/10" />

					<!-- Tabs (Inside Header Wrapper for correct context) -->
					<div class="mt-1">
						<nav class="no-scrollbar flex w-full space-x-1 overflow-x-auto">
							{#each tabs as tab}
								<a
									href={tab.href}
									class="flex items-center whitespace-nowrap border-b-[3px] px-4 py-4 text-sm font-semibold transition-colors
									{$page.url.pathname === tab.href
										? 'border-primary text-primary'
										: 'text-muted-foreground hover:text-foreground rounded-t-lg border-transparent hover:bg-black/5'}"
								>
									{tab.name}
								</a>
							{/each}
							<div class="flex-1"></div>
							<Button variant="ghost" size="icon" class="self-center rounded-full">
								<Search size={20} class="text-muted-foreground" />
							</Button>
						</nav>
					</div>
				</div>
			</div>
		</div>

		<!-- Main Content Area -->
		<div class="min-h-screen bg-gray-100/50 pt-6 dark:bg-black/20">
			<!-- Subtle different background for feed area -->
			<div class="container mx-auto max-w-6xl px-4">
				<slot />
			</div>
		</div>
	</div>
{:else}
	<div class="text-muted-foreground flex h-screen items-center justify-center p-10 text-center">
		<div class="glass-panel p-8">
			<h2 class="mb-2 text-xl font-bold">Unavailable</h2>
			<p>Community not found or you don't have access.</p>
			<Button href="/communities" variant="outline" class="mt-4">Go Back</Button>
		</div>
	</div>
{/if}
