<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getCommunity, updateCommunitySettings, type Community } from '$lib/api';
	import { goto } from '$app/navigation';
	import { Save, Trash2, Lock, Globe, Shield, AlertTriangle } from '@lucide/svelte';

	let id = $page.params.id;
	let community: Community | null = null;
	let loading = true;
	let saving = false;
	let error = '';
	let success = '';

	// Form fields
	let name = '';
	let description = '';
	let category = '';
	let privacy = '';
	let require_join_approval = false;
	let require_post_approval = false;
	let avatar = '';
	let cover_image = '';

	async function loadData() {
		try {
			// We reload to get fresh data and check admin status
			community = await getCommunity(id);
			if (!community.is_admin) {
				error = 'You are not authorized to view this page.';
				loading = false;
				return;
			}

			// Init form
			name = community.name;
			description = community.description;
			category = community.category;
			privacy = community.privacy;
			require_join_approval = community.settings.require_join_approval;
			require_post_approval = community.settings.require_post_approval;
			avatar = community.avatar;
			cover_image = community.cover_image;

			loading = false;
		} catch (e: any) {
			console.error(e);
			error = e.message;
			loading = false;
		}
	}

	async function handleSave() {
		saving = true;
		error = '';
		success = '';
		try {
			await updateCommunitySettings(id, {
				name,
				description,
				category,
				privacy,
				require_join_approval,
				require_post_approval,
				avatar,
				cover_image
			});
			success = 'Settings updated successfully!';
			// Refresh data to ensure sync
			await loadData();
		} catch (e: any) {
			console.error(e);
			error = e.message;
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (
			!confirm(
				'Are you ABSOLUTELY SURE? This action cannot be undone. This will permanently delete the community and all its contents.'
			)
		)
			return;

		// TODO: Implement deleteCommunity API
		alert('Delete functionality not yet implemented in backend.');
	}

	onMount(() => {
		loadData();
	});
</script>

{#if loading}
	<div class="p-10 text-center">
		<div
			class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
		></div>
	</div>
{:else if error && !community}
	<div class="mx-auto max-w-2xl p-8 text-center">
		<div class="mb-4 text-6xl text-red-500">🚫</div>
		<h1 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
		<p class="mb-6 text-gray-600 dark:text-gray-400">{error}</p>
		<a
			href="/communities/{id}"
			class="rounded-xl bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-700">Go Back</a
		>
	</div>
{:else if community}
	<div class="mx-auto max-w-3xl pb-10">
		<div
			class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
		>
			<!-- Header -->
			<div class="border-b border-gray-100 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
				<h2 class="text-xl font-bold text-gray-900 dark:text-white">Community Settings</h2>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Manage your community profile and preferences.
				</p>
			</div>

			<div class="space-y-8 p-6">
				{#if success}
					<div
						class="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-green-700 dark:bg-green-900/20 dark:text-green-400"
					>
						<div class="h-2 w-2 rounded-full bg-green-500"></div>
						{success}
					</div>
				{/if}
				{#if error}
					<div
						class="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400"
					>
						<div class="h-2 w-2 rounded-full bg-red-500"></div>
						{error}
					</div>
				{/if}

				<!-- General Settings -->
				<section class="space-y-6">
					<h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
						General Information
					</h3>

					<div class="grid grid-cols-1 gap-6">
						<div>
							<label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
								>Community Name</label
							>
							<input
								type="text"
								bind:value={name}
								class="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
							/>
						</div>

						<div>
							<label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
								>Description</label
							>
							<textarea
								bind:value={description}
								rows="4"
								class="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
							/>
						</div>

						<div>
							<label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
								>Category</label
							>
							<select
								bind:value={category}
								class="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2 text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
							>
								<option value="technology">Technology</option>
								<option value="gaming">Gaming</option>
								<option value="art">Art & Design</option>
								<option value="science">Science</option>
								<option value="music">Music</option>
								<option value="sports">Sports</option>
								<option value="other">Other</option>
							</select>
						</div>
					</div>
				</section>

				<hr class="border-gray-100 dark:border-gray-700" />

				<!-- Privacy -->
				<section class="space-y-6">
					<h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
						Privacy & Access
					</h3>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<label class="relative cursor-pointer">
							<input type="radio" bind:group={privacy} value="public" class="peer sr-only" />
							<div
								class="h-full rounded-xl border-2 border-gray-200 p-4 transition-all hover:bg-gray-50 peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:border-gray-700 dark:hover:bg-gray-700/50 dark:peer-checked:bg-blue-900/20"
							>
								<Globe
									class="mb-2 h-6 w-6 text-gray-500 peer-checked:text-blue-500 dark:text-gray-400"
								/>
								<div class="font-bold text-gray-900 dark:text-white">Public</div>
								<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
									Anyone can see who's in the group and what they post.
								</div>
							</div>
						</label>

						<label class="relative cursor-pointer">
							<input type="radio" bind:group={privacy} value="closed" class="peer sr-only" />
							<div
								class="h-full rounded-xl border-2 border-gray-200 p-4 transition-all hover:bg-gray-50 peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:border-gray-700 dark:hover:bg-gray-700/50 dark:peer-checked:bg-blue-900/20"
							>
								<Lock
									class="mb-2 h-6 w-6 text-gray-500 peer-checked:text-blue-500 dark:text-gray-400"
								/>
								<div class="font-bold text-gray-900 dark:text-white">Closed</div>
								<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
									Anyone can find the group, but only members can see posts.
								</div>
							</div>
						</label>

						<label class="relative cursor-pointer">
							<input type="radio" bind:group={privacy} value="secret" class="peer sr-only" />
							<div
								class="h-full rounded-xl border-2 border-gray-200 p-4 transition-all hover:bg-gray-50 peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:border-gray-700 dark:hover:bg-gray-700/50 dark:peer-checked:bg-blue-900/20"
							>
								<Shield
									class="mb-2 h-6 w-6 text-gray-500 peer-checked:text-blue-500 dark:text-gray-400"
								/>
								<div class="font-bold text-gray-900 dark:text-white">Secret</div>
								<div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
									Only members can find the group and see posts.
								</div>
							</div>
						</label>
					</div>
				</section>

				<hr class="border-gray-100 dark:border-gray-700" />

				<!-- Moderation -->
				<section class="space-y-6">
					<h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
						Moderation
					</h3>

					<div class="space-y-4">
						<label
							class="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 p-4 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
						>
							<div>
								<div class="font-medium text-gray-900 dark:text-white">Require Join Approval</div>
								<div class="text-sm text-gray-500 dark:text-gray-400">
									Admins must approve new members
								</div>
							</div>
							<div class="relative inline-flex cursor-pointer items-center">
								<input type="checkbox" bind:checked={require_join_approval} class="peer sr-only" />
								<div
									class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"
								></div>
							</div>
						</label>

						<label
							class="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 p-4 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
						>
							<div>
								<div class="font-medium text-gray-900 dark:text-white">Require Post Approval</div>
								<div class="text-sm text-gray-500 dark:text-gray-400">
									Admins must approve posts before they are visible
								</div>
							</div>
							<div class="relative inline-flex cursor-pointer items-center">
								<input type="checkbox" bind:checked={require_post_approval} class="peer sr-only" />
								<div
									class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"
								></div>
							</div>
						</label>
					</div>
				</section>

				<!-- Action Buttons -->
				<div class="flex items-center justify-end gap-4 pt-4">
					<button
						disabled={saving}
						on:click={() => loadData()}
						class="rounded-xl px-6 py-2.5 font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						Reset
					</button>
					<button
						disabled={saving}
						on:click={handleSave}
						class="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-2.5 font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700"
					>
						{#if saving}
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
							></div>
							Saving...
						{:else}
							<Save class="h-4 w-4" />
							Save Changes
						{/if}
					</button>
				</div>
			</div>
		</div>

		<!-- Danger Zone -->
		<div
			class="mt-8 overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm dark:border-red-900/30 dark:bg-gray-800"
		>
			<div
				class="border-b border-red-100 bg-red-50/50 p-6 dark:border-red-900/30 dark:bg-red-900/10"
			>
				<h2 class="flex items-center gap-2 text-xl font-bold text-red-600 dark:text-red-500">
					<AlertTriangle class="h-5 w-5" /> Danger Zone
				</h2>
			</div>
			<div class="flex items-center justify-between p-6">
				<div>
					<h3 class="font-bold text-gray-900 dark:text-white">Delete Community</h3>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						Once you delete a community, there is no going back. Please be certain.
					</p>
				</div>
				<button
					on:click={handleDelete}
					class="flex items-center gap-2 rounded-xl bg-red-100 px-6 py-2.5 font-bold text-red-700 transition hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
				>
					<Trash2 class="h-4 w-4" />
					Delete Community
				</button>
			</div>
		</div>
	</div>
{/if}
