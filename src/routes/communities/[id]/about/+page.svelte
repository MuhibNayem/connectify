<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getCommunity, type Community } from '$lib/api';
	import { Globe, Lock, Shield, Calendar, Users } from '@lucide/svelte';

	let id = $page.params.id;
	let community: Community | null = null;
	let loading = true;

	onMount(async () => {
		try {
			community = await getCommunity(id);
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	});

	function getPrivacyIcon(p: string) {
		if (p === 'secret') return Shield;
		if (p === 'closed') return Lock;
		return Globe;
	}
</script>

{#if loading}
	<div class="animate-pulse space-y-4">
		<div class="h-8 w-1/3 rounded bg-gray-200 dark:bg-gray-700"></div>
		<div class="h-24 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
	</div>
{:else if community}
	<div class="mx-auto max-w-4xl space-y-8">
		<!-- About Card -->
		<div
			class="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
		>
			<h2 class="mb-6 text-2xl font-bold text-gray-900 dark:text-white">About this community</h2>

			<p class="mb-8 whitespace-pre-line text-lg text-gray-600 dark:text-gray-300">
				{community.description}
			</p>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<div class="flex items-start gap-4">
					<div
						class="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
					>
						<svelte:component this={getPrivacyIcon(community.privacy)} class="h-6 w-6" />
					</div>
					<div>
						<h3 class="font-bold capitalize text-gray-900 dark:text-white">{community.privacy}</h3>
						<p class="text-sm text-gray-500 dark:text-gray-400">
							{#if community.privacy === 'public'}
								Anyone can see who's in the group and what they post.
							{:else if community.privacy === 'closed'}
								Anyone can find the group, but only members can see posts.
							{:else}
								Only members can find the group and see posts.
							{/if}
						</p>
					</div>
				</div>

				<div class="flex items-start gap-4">
					<div
						class="rounded-xl bg-purple-50 p-3 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
					>
						<Calendar class="h-6 w-6" />
					</div>
					<div>
						<h3 class="font-bold text-gray-900 dark:text-white">History</h3>
						<p class="text-sm text-gray-500 dark:text-gray-400">
							Created on {new Date(community.created_at).toLocaleDateString(undefined, {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</p>
					</div>
				</div>

				<div class="flex items-start gap-4">
					<div
						class="rounded-xl bg-green-50 p-3 text-green-600 dark:bg-green-900/20 dark:text-green-400"
					>
						<Users class="h-6 w-6" />
					</div>
					<div>
						<h3 class="font-bold text-gray-900 dark:text-white">Members</h3>
						<p class="text-sm text-gray-500 dark:text-gray-400">
							{community.stats.member_count} total members
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Rules (Placeholder) -->
		<div
			class="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
		>
			<h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Group Rules</h2>
			<ul class="space-y-4">
				<li class="flex gap-4">
					<span class="font-bold text-blue-600 dark:text-blue-400">1</span>
					<span class="text-gray-600 dark:text-gray-300">Be kind and courteous.</span>
				</li>
				<li class="flex gap-4">
					<span class="font-bold text-blue-600 dark:text-blue-400">2</span>
					<span class="text-gray-600 dark:text-gray-300">No hate speech or bullying.</span>
				</li>
				<li class="flex gap-4">
					<span class="font-bold text-blue-600 dark:text-blue-400">3</span>
					<span class="text-gray-600 dark:text-gray-300">No promotions or spam.</span>
				</li>
			</ul>
		</div>
	</div>
{/if}
