<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import {
		getCommunityMembers,
		getCommunityAdmins,
		getCommunityPendingMembers,
		approveCommunityMember,
		rejectCommunityMember,
		getCommunity,
		type Community
	} from '$lib/api';
	import { auth } from '$lib/stores/auth.svelte';
	import { Shield, User, Clock, Check, X, Search } from '@lucide/svelte';
	import type { User as UserType } from '$lib/types';

	let id = $page.params.id;
	let community: Community | null = null;
	let members: UserType[] = [];
	let admins: UserType[] = [];
	let pendingMembers: UserType[] = [];
	let loading = true;
	let error = '';

	let activeTab = 'members'; // members, admins, pending

	async function loadData() {
		loading = true;
		try {
			// Reload community to check permissions (admin status)
			community = await getCommunity(id);

			const [membersRes, adminsRes] = await Promise.all([
				getCommunityMembers(id),
				getCommunityAdmins(id)
			]);

			members = membersRes.users || [];
			admins = adminsRes || [];

			if (community?.is_admin && community.settings.require_join_approval) {
				const pendingRes = await getCommunityPendingMembers(id);
				pendingMembers = pendingRes.users || [];
			}
		} catch (e: any) {
			console.error(e);
			error = e.message;
		} finally {
			loading = false;
		}
	}

	async function handleApprove(userId: string) {
		try {
			await approveCommunityMember(id, userId);
			pendingMembers = pendingMembers.filter((u) => u.id !== userId);
			// Ideally refresh members list or add locally
			loadData();
		} catch (e: any) {
			alert(e.message);
		}
	}

	async function handleReject(userId: string) {
		if (!confirm('Reject this user?')) return;
		try {
			await rejectCommunityMember(id, userId);
			pendingMembers = pendingMembers.filter((u) => u.id !== userId);
		} catch (e: any) {
			alert(e.message);
		}
	}

	onMount(() => {
		loadData();
	});
</script>

{#if loading && !community}
	<div class="p-10 text-center">
		<div
			class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
		></div>
	</div>
{:else if error}
	<div class="rounded-xl bg-red-50 p-4 text-red-600">{error}</div>
{:else if community}
	<div class="mx-auto max-w-4xl space-y-6">
		<div
			class="flex items-center gap-4 overflow-x-auto border-b border-gray-200 dark:border-gray-700"
		>
			<button
				class="whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors {activeTab ===
				'members'
					? 'border-blue-500 text-blue-600 dark:text-blue-400'
					: 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}"
				on:click={() => (activeTab = 'members')}
			>
				Members ({members.length})
			</button>
			<button
				class="whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors {activeTab ===
				'admins'
					? 'border-blue-500 text-blue-600 dark:text-blue-400'
					: 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}"
				on:click={() => (activeTab = 'admins')}
			>
				Admins ({admins.length})
			</button>
			{#if community.is_admin}
				<button
					class="whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors {activeTab ===
					'pending'
						? 'border-blue-500 text-blue-600 dark:text-blue-400'
						: 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}"
					on:click={() => (activeTab = 'pending')}
				>
					Pending Requests ({pendingMembers.length})
				</button>
			{/if}
		</div>

		<div
			class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
		>
			{#if activeTab === 'members'}
				<div class="divide-y divide-gray-100 dark:divide-gray-700">
					{#each members as user}
						<div
							class="dark:hover:bg-gray-750 flex items-center justify-between p-4 transition-colors hover:bg-gray-50"
						>
							<div class="flex items-center gap-4">
								<a
									href={`/users/${user.username}`}
									class="block h-12 w-12 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"
								>
									{#if user.avatar}
										<img src={user.avatar} alt={user.username} class="h-full w-full object-cover" />
									{:else}
										<div
											class="flex h-full w-full items-center justify-center text-lg font-bold text-gray-400"
										>
											{user.username[0].toUpperCase()}
										</div>
									{/if}
								</a>
								<div>
									<a
										href={`/users/${user.username}`}
										class="font-bold text-gray-900 hover:underline dark:text-white"
									>
										{user.full_name || user.username}
									</a>
									<p class="text-xs text-gray-500 dark:text-gray-400">@{user.username}</p>
								</div>
							</div>

							{#if community.is_admin && user.id !== auth.user?.id}
								<!-- Admin Actions for Members (e.g. Kick, Ban - pending impl) -->
								<div class="group relative">
									<!-- Placeholder for actions -->
								</div>
							{/if}
						</div>
					{:else}
						<div class="p-8 text-center text-gray-500">No members found.</div>
					{/each}
				</div>
			{:else if activeTab === 'admins'}
				<div class="divide-y divide-gray-100 dark:divide-gray-700">
					{#each admins as user}
						<div
							class="dark:hover:bg-gray-750 flex items-center justify-between p-4 transition-colors hover:bg-gray-50"
						>
							<div class="flex items-center gap-4">
								<a
									href={`/users/${user.username}`}
									class="block h-12 w-12 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"
								>
									{#if user.avatar}
										<img src={user.avatar} alt={user.username} class="h-full w-full object-cover" />
									{:else}
										<div
											class="flex h-full w-full items-center justify-center text-lg font-bold text-gray-400"
										>
											{user.username[0].toUpperCase()}
										</div>
									{/if}
								</a>
								<div>
									<a
										href={`/users/${user.username}`}
										class="font-bold text-gray-900 hover:underline dark:text-white"
									>
										{user.full_name || user.username}
										<span
											class="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
											>Admin</span
										>
									</a>
									<p class="text-xs text-gray-500 dark:text-gray-400">@{user.username}</p>
								</div>
							</div>
						</div>
					{:else}
						<div class="p-8 text-center text-gray-500">No admins found.</div>
					{/each}
				</div>
			{:else if activeTab === 'pending'}
				<div class="divide-y divide-gray-100 dark:divide-gray-700">
					{#each pendingMembers as user}
						<div
							class="dark:hover:bg-gray-750 flex items-center justify-between p-4 transition-colors hover:bg-gray-50"
						>
							<div class="flex items-center gap-4">
								<a
									href={`/users/${user.username}`}
									class="block h-12 w-12 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"
								>
									{#if user.avatar}
										<img src={user.avatar} alt={user.username} class="h-full w-full object-cover" />
									{:else}
										<div
											class="flex h-full w-full items-center justify-center text-lg font-bold text-gray-400"
										>
											{user.username[0].toUpperCase()}
										</div>
									{/if}
								</a>
								<div>
									<a
										href={`/users/${user.username}`}
										class="font-bold text-gray-900 hover:underline dark:text-white"
									>
										{user.full_name || user.username}
									</a>
									<p class="text-xs text-gray-500 dark:text-gray-400">@{user.username}</p>
									<p class="mt-1 text-xs text-gray-400">Requested to join</p>
								</div>
							</div>

							<div class="flex items-center gap-2">
								<button
									on:click={() => handleApprove(user.id)}
									class="rounded-lg bg-green-100 p-2 text-green-600 transition-colors hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
									title="Approve"
								>
									<Check class="h-5 w-5" />
								</button>
								<button
									on:click={() => handleReject(user.id)}
									class="rounded-lg bg-red-100 p-2 text-red-600 transition-colors hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
									title="Reject"
								>
									<X class="h-5 w-5" />
								</button>
							</div>
						</div>
					{:else}
						<div class="p-8 text-center text-gray-500">No pending requests.</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
