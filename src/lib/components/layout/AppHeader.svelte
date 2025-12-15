<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import SearchInput from '$lib/components/ui/search/SearchInput.svelte';
	import NotificationList from '../notifications/NotificationList.svelte';
	import { notifications } from '../../stores/notifications';
	import { auth } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';

	let showNotifications = false;
	let notificationButton: HTMLElement;
	let notificationList: HTMLElement;
	let mobileMenuOpen = false;

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function handleSearchSubmit(event: CustomEvent<string>) {
		const query = event.detail;
		if (query) {
			goto(`/search?query=${encodeURIComponent(query)}`);
		}
	}

	function toggleNotifications() {
		showNotifications = !showNotifications;
	}

	async function handleLogout() {
		await auth.logout();
		goto('/');
	}

	function handleClickOutside(event: MouseEvent) {
		if (
			showNotifications &&
			!notificationButton.contains(event.target as Node) &&
			!notificationList.contains(event.target as Node)
		) {
			showNotifications = false;
		}
	}

	onMount(() => {
		window.addEventListener('click', handleClickOutside);
		return () => {
			window.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<header
	class="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-md"
>
	<div class="flex items-center space-x-4">
		<Button
			variant="ghost"
			size="icon"
			class="rounded-full hover:bg-gray-100 md:hidden"
			onclick={toggleMobileMenu}
		>
			<span class="text-2xl">☰</span>
		</Button>
		<a href="/dashboard" class="text-2xl font-bold text-indigo-600">Connectify</a>
		<div class="relative hidden max-w-md flex-grow md:block">
			<SearchInput on:search={handleSearchSubmit} />
		</div>
	</div>

	<nav class="hidden items-center space-x-6 md:flex">
		<Button
			variant="ghost"
			size="icon"
			class="rounded-full hover:bg-gray-100"
			onclick={() => goto('/dashboard')}
		>
			<span class="text-2xl">🏠</span>
		</Button>
		<Button
			variant="ghost"
			size="icon"
			class="rounded-full hover:bg-gray-100"
			onclick={() => goto('/friends')}
		>
			<span class="text-2xl">👥</span>
		</Button>
		<Button
			variant="ghost"
			size="icon"
			class="rounded-full hover:bg-gray-100"
			onclick={() => goto('/messages')}
		>
			<span class="text-2xl">💬</span>
		</Button>
		<div class="relative">
			<div bind:this={notificationButton}>
				<Button
					variant="ghost"
					size="icon"
					class="rounded-full hover:bg-gray-100"
					onclick={toggleNotifications}
				>
					<span class="text-2xl">🔔</span>
					{#if $notifications.unreadCount > 0}
						<span
							class="absolute right-0 top-0 inline-flex -translate-y-1/2 translate-x-1/2 transform items-center justify-center rounded-full bg-red-600 px-2 py-1 text-xs font-bold leading-none text-red-100"
						>
							{$notifications.unreadCount}
						</span>
					{/if}
				</Button>
			</div>
			{#if showNotifications}
				<div
					bind:this={notificationList}
					class="absolute right-0 z-50 mt-2 w-80 rounded-md bg-white shadow-lg"
				>
					<NotificationList />
				</div>
			{/if}
		</div>
	</nav>

	<div class="flex items-center space-x-4">
		<Button
			variant="ghost"
			size="icon"
			class="rounded-full hover:bg-gray-100"
			onclick={() => goto(`/profile/${auth.state.user?.id}`)}
		>
			<span class="text-2xl">👤</span>
		</Button>
		<Button variant="ghost" class="hidden sm:block" onclick={handleLogout}>Logout</Button>
	</div>

	{#if mobileMenuOpen}
		<div class="fixed bottom-0 left-0 right-0 top-14 z-40 bg-white p-4 md:hidden">
			<nav class="flex flex-col space-y-4">
				<a
					href="/dashboard"
					class="text-lg font-medium text-gray-700 hover:text-indigo-600"
					on:click={() => (mobileMenuOpen = false)}>Dashboard</a
				>
				<a
					href="/friends"
					class="text-lg font-medium text-gray-700 hover:text-indigo-600"
					on:click={() => (mobileMenuOpen = false)}>Friends</a
				>
				<a
					href="/messages"
					class="text-lg font-medium text-gray-700 hover:text-indigo-600"
					on:click={() => (mobileMenuOpen = false)}>Messages</a
				>
				<a
					href="/profile/{auth.state.user?.id}"
					class="text-lg font-medium text-gray-700 hover:text-indigo-600"
					on:click={() => (mobileMenuOpen = false)}>Profile</a
				>
				<Button variant="ghost" class="w-full" onclick={handleLogout}>Logout</Button>
			</nav>
		</div>
	{/if}
</header>
