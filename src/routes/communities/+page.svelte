<script lang="ts">
	import { onMount } from 'svelte';
	import { getCommunities, getUserCommunities, type Community } from '$lib/api';
	import { auth } from '$lib/stores/auth.svelte';
	import { Plus, Users, Search, ArrowRight } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	// State
	let communities: Community[] = [];
	let userCommunities: Community[] = [];
	let loading = true;
	let searchQuery = '';
	let searchTimeout: any;

	// Pagination
	let currentPage = 1;
	let totalCommunities = 0;
	const limit = 9; // Grid of 3x3

	async function loadCommunities(page: number = 1, query: string = '') {
		try {
			loading = true;
			const res = await getCommunities(page, limit, query);
			communities = res.communities;
			totalCommunities = res.total;
			currentPage = res.page;
		} catch (error) {
			console.error('Failed to load communities:', error);
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			currentPage = 1;
			loadCommunities(1, searchQuery);
		}, 300);
	}

	function handlePageChange(newPage: number) {
		if (newPage < 1 || newPage > Math.ceil(totalCommunities / limit)) return;
		loadCommunities(newPage, searchQuery);
	}

	onMount(async () => {
		try {
			const [_, userRes] = await Promise.all([loadCommunities(1), getUserCommunities()]);
			userCommunities = userRes;
		} catch (error) {
			console.error('Failed to load initial data:', error);
		}
	});
</script>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1
				class="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-3xl font-bold text-transparent dark:from-white dark:to-gray-300"
			>
				Communities
			</h1>
			<p class="mt-1 text-gray-500 dark:text-gray-400">
				Discover and join communities that interest you
			</p>
		</div>
		<a
			href="/communities/create"
			class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white shadow-lg backdrop-blur-md transition-all hover:bg-blue-700 hover:shadow-blue-500/20 active:scale-95"
		>
			<Plus class="h-5 w-5" />
			Create Community
		</a>
	</div>

	<!-- My Communities -->
	{#if userCommunities.length > 0}
		<section class="mb-12">
			<h2
				class="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-gray-200"
			>
				<Users class="h-5 w-5" />
				Your Communities
			</h2>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each userCommunities as community}
					<a
						href="/communities/{community.id}"
						class="group relative block overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.2)] bg-white/50 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md dark:border-gray-700/30 dark:bg-gray-800/50"
					>
						<div class="relative h-32 w-full overflow-hidden bg-gray-200 dark:bg-gray-700">
							{#if community.cover_image}
								<img
									src={community.cover_image}
									alt={community.name}
									class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
								/>
							{:else}
								<div
									class="h-full w-full bg-gradient-to-br from-blue-400 to-purple-500 opacity-80"
								/>
							{/if}
							<div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
						</div>
						<div class="relative p-5 pt-12">
							<div class="absolute -top-8 left-5">
								<div
									class="h-16 w-16 overflow-hidden rounded-xl border-4 border-white bg-white shadow-md dark:border-gray-800 dark:bg-gray-800"
								>
									{#if community.avatar}
										<img
											src={community.avatar}
											alt={community.name}
											class="h-full w-full object-cover"
										/>
									{:else}
										<div
											class="flex h-full w-full items-center justify-center bg-gray-100 text-xl font-bold text-gray-400 dark:bg-gray-700"
										>
											{community.name[0]}
										</div>
									{/if}
								</div>
							</div>
							<h3 class="mb-1 text-lg font-bold text-gray-900 dark:text-white">{community.name}</h3>
							<p class="mb-4 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
								{community.description}
							</p>
							<div
								class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"
							>
								<span>{community.stats.member_count} members</span>
								<span
									class="rounded-full border border-gray-200 bg-gray-100 px-2 py-1 dark:border-gray-600/30 dark:bg-gray-700/50"
								>
									{community.privacy}
								</span>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Discover -->
	<section>
		<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<h2 class="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
				<Search class="h-5 w-5" />
				Discover
			</h2>

			<!-- Search Input -->
			<div class="relative w-full sm:w-64 md:w-80">
				<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
					<Search class="h-4 w-4 text-gray-400" />
				</div>
				<input
					type="text"
					bind:value={searchQuery}
					on:input={handleSearch}
					placeholder="Search communities..."
					class="block w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-blue-500"
				/>
			</div>
		</div>

		{#if loading}
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each Array(3) as _}
					<div class="h-64 animate-pulse rounded-2xl bg-white/50 dark:bg-gray-800/50" />
				{/each}
			</div>
		{:else if communities.length === 0}
			<div
				class="rounded-2xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700"
			>
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
				>
					<Search class="h-8 w-8 text-gray-400" />
				</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No communities found</h3>
				<p class="text-gray-500 dark:text-gray-400">
					Try adjusting your search terms or create your own community.
				</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each communities as community}
					<a
						href="/communities/{community.id}"
						class="group relative block overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.2)] bg-white/50 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md dark:border-gray-700/30 dark:bg-gray-800/50"
					>
						<div class="relative h-32 w-full overflow-hidden bg-gray-200 dark:bg-gray-700">
							{#if community.cover_image}
								<img
									src={community.cover_image}
									alt={community.name}
									class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
								/>
							{:else}
								<div
									class="h-full w-full bg-gradient-to-br from-indigo-400 to-pink-500 opacity-80"
								/>
							{/if}
						</div>
						<div class="p-5">
							<div class="mb-3 flex items-start justify-between">
								<div
									class="h-12 w-12 overflow-hidden rounded-xl bg-gray-100 shadow-sm dark:bg-gray-700"
								>
									{#if community.avatar}
										<img
											src={community.avatar}
											alt={community.name}
											class="h-full w-full object-cover"
										/>
									{:else}
										<div
											class="flex h-full w-full items-center justify-center font-bold text-gray-400"
										>
											{community.name[0]}
										</div>
									{/if}
								</div>
								{#if !community.is_member}
									<button
										class="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
									>
										Join
									</button>
								{:else}
									<div
										class="rounded-lg bg-green-50 p-2 text-green-600 dark:bg-green-900/20 dark:text-green-400"
									>
										<div class="h-5 w-5 rounded-full border-2 border-current p-0.5">
											<div class="h-full w-full rounded-full bg-current"></div>
										</div>
									</div>
								{/if}
							</div>
							<h3
								class="mb-1 text-lg font-bold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400"
							>
								{community.name}
							</h3>
							<p class="mb-4 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
								{community.description}
							</p>
							<div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
								<span class="flex items-center gap-1">
									<Users class="h-3 w-3" />
									{community.stats.member_count}
								</span>
								<span
									class="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 capitalize dark:border-gray-600/30 dark:bg-gray-700/50"
								>
									{community.category}
								</span>
							</div>
						</div>
					</a>
				{/each}
			</div>

			<!-- Pagination -->
			{#if totalCommunities > limit}
				<div class="mt-8 flex justify-center gap-2">
					<button
						class="rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
						disabled={currentPage === 1}
						on:click={() => handlePageChange(currentPage - 1)}
					>
						Previous
					</button>
					<span class="flex items-center px-4 font-medium text-gray-600 dark:text-gray-400">
						Page {currentPage} of {Math.ceil(totalCommunities / limit)}
					</span>
					<button
						class="rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
						disabled={currentPage >= Math.ceil(totalCommunities / limit)}
						on:click={() => handlePageChange(currentPage + 1)}
					>
						Next
					</button>
				</div>
			{/if}
		{/if}
	</section>
</div>
