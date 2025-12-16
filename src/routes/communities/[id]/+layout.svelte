<script context="module">
	import { CheckCircle } from '@lucide/svelte';
</script>

<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getCommunity, joinCommunity, leaveCommunity, type Community } from '$lib/api';
	import { auth } from '$lib/stores/auth.svelte';
	import { Users, Shield, Settings, FileText, Share2, MoreHorizontal } from '@lucide/svelte';

	let community: Community | null = null;
	let loading = true;
	let id = $page.params.id;

	// Tab configuration
	const tabs = [
		{ name: 'Feed', href: `/communities/${id}`, icon: FileText },
		{ name: 'About', href: `/communities/${id}/about`, icon: Shield },
		{ name: 'Members', href: `/communities/${id}/members`, icon: Users }
	];

	$: if (community?.is_admin) {
		if (!tabs.find((t) => t.name === 'Settings')) {
			tabs.push({ name: 'Settings', href: `/communities/${id}/settings`, icon: Settings });
		}
	}

	async function loadCommunity() {
		console.log('loadCommunity called with id:', id);
		try {
			loading = true;
			console.log('Fetching community...');
			community = await getCommunity(id);
			console.log('Community loaded:', community);
		} catch (error) {
			console.error('Error loading community:', error);
		} finally {
			loading = false;
			console.log('Loading set to false');
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
	<div class="flex h-96 w-full items-center justify-center">
		<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
	</div>
{:else if community}
	<div class="container mx-auto max-w-6xl pb-10">
		<!-- Cover Image -->
		<div class="group relative h-64 w-full overflow-hidden rounded-b-3xl shadow-xl md:h-80 lg:h-96">
			{#if community.cover_image}
				<img src={community.cover_image} alt={community.name} class="h-full w-full object-cover" />
			{:else}
				<div class="h-full w-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
			{/if}
			<div
				class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"
			></div>
		</div>

		<!-- Header -->
		<div class="relative -mt-20 px-4 md:px-8">
			<div
				class="flex flex-col items-start gap-6 rounded-3xl border border-white/20 bg-white/80 p-6 shadow-2xl backdrop-blur-2xl md:flex-row md:items-end dark:border-white/10 dark:bg-black/60"
			>
				<!-- Avatar -->
				<div class="relative -mt-20 rounded-2xl bg-white p-1.5 shadow-lg md:-mt-24 dark:bg-black">
					<div
						class="h-32 w-32 overflow-hidden rounded-xl bg-gray-100 md:h-40 md:w-40 dark:bg-gray-800"
					>
						{#if community.avatar}
							<img src={community.avatar} alt={community.name} class="h-full w-full object-cover" />
						{:else}
							<div
								class="flex h-full w-full items-center justify-center bg-gray-200 text-4xl font-bold text-gray-400 dark:bg-gray-700"
							>
								{community.name[0]}
							</div>
						{/if}
					</div>
				</div>

				<!-- Info -->
				<div class="min-w-0 flex-1 pb-2">
					<h1 class="mb-2 text-3xl font-bold text-gray-900 md:text-4xl dark:text-white">
						{community.name}
					</h1>
					<div class="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
						<span class="flex items-center gap-1">
							<Shield class="h-4 w-4" />
							{community.privacy} group
						</span>
						<span class="h-1 w-1 rounded-full bg-gray-400"></span>
						<span class="flex items-center gap-1 font-medium">
							<Users class="h-4 w-4" />
							{community.stats.member_count} members
						</span>
						<span class="h-1 w-1 rounded-full bg-gray-400"></span>
						<span
							class="rounded-md bg-gray-200 px-2 py-0.5 text-xs font-bold uppercase tracking-wide dark:bg-gray-700"
						>
							{community.category}
						</span>
					</div>
				</div>

				<!-- Actions -->
				<div class="mt-4 flex w-full items-center gap-3 md:mt-0 md:w-auto">
					{#if community.is_member}
						<div class="group relative">
							<button
								class="flex items-center gap-2 rounded-xl bg-gray-100 px-6 py-2.5 font-medium text-gray-900 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
							>
								<CheckCircle class="h-4 w-4 text-green-500" /> Joined
							</button>
							<!-- Dropdown for Leave -->
							<div
								class="invisible absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-gray-100 bg-white py-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100 dark:border-gray-700 dark:bg-gray-800"
							>
								<button
									on:click={handleLeave}
									class="w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
								>
									Leave Community
								</button>
							</div>
						</div>
						<button
							class="rounded-xl bg-gray-100 p-2.5 text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-300"
						>
							<Share2 class="h-5 w-5" />
						</button>
					{:else if community.is_pending}
						<button
							disabled
							class="cursor-not-allowed rounded-xl bg-gray-200 px-8 py-2.5 font-medium text-gray-500 dark:bg-gray-700"
						>
							Pending Approval
						</button>
					{:else}
						<button
							on:click={handleJoin}
							class="flex-1 rounded-xl bg-blue-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 active:scale-95 md:flex-none"
						>
							Join Community
						</button>
					{/if}
				</div>
			</div>
		</div>

		<!-- Navigation -->
		<div class="mt-8 border-b border-gray-200 px-4 md:px-8 dark:border-gray-800">
			<nav class="flex space-x-8">
				{#each tabs as tab}
					<a
						href={tab.href}
						class="flex items-center gap-2 border-b-2 px-2 pb-4 text-sm font-medium transition-colors {$page
							.url.pathname === tab.href
							? 'border-blue-500 text-blue-600 dark:text-blue-400'
							: 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
					>
						<svelte:component this={tab.icon} class="h-4 w-4" />
						{tab.name}
					</a>
				{/each}
			</nav>
		</div>

		<!-- Content -->
		<div class="mt-8 px-4 md:px-8">
			<slot />
		</div>
	</div>
{:else}
	<div class="p-10 text-center text-gray-500">Community not found or you don't have access.</div>
{/if}
