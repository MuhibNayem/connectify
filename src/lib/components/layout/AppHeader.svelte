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
        if (showNotifications && 
            !notificationButton.contains(event.target as Node) && 
            !notificationList.contains(event.target as Node)) {
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

<header class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 bg-white shadow-md border-b border-gray-200">
    <div class="flex items-center space-x-4">
        <Button variant="ghost" size="icon" class="md:hidden rounded-full hover:bg-gray-100" onclick={toggleMobileMenu}>
            <span class="text-2xl">☰</span>
        </Button>
        <a href="/dashboard" class="text-2xl font-bold text-indigo-600">Connectify</a>
        <div class="hidden md:block relative flex-grow max-w-md">
            <SearchInput on:search={handleSearchSubmit} />
        </div>
    </div>

    <nav class="hidden md:flex items-center space-x-6">
        <Button variant="ghost" size="icon" class="rounded-full hover:bg-gray-100" onclick={() => goto('/dashboard')}>
            <span class="text-2xl">🏠</span>
        </Button>
        <Button variant="ghost" size="icon" class="rounded-full hover:bg-gray-100" onclick={() => goto('/friends')}>
            <span class="text-2xl">👥</span>
        </Button>
        <Button variant="ghost" size="icon" class="rounded-full hover:bg-gray-100" onclick={() => goto('/messages')}>
            <span class="text-2xl">💬</span>
        </Button>
        <div class="relative">
            <div bind:this={notificationButton}>
                <Button variant="ghost" size="icon" class="rounded-full hover:bg-gray-100" onclick={toggleNotifications}>
                    <span class="text-2xl">🔔</span>
                    {#if $notifications.unreadCount > 0}
                        <span class="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                            {$notifications.unreadCount}
                        </span>
                    {/if}
                </Button>
            </div>
            {#if showNotifications}
                <div bind:this={notificationList} class="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50">
                    <NotificationList />
                </div>
            {/if}
        </div>
    </nav>

    <div class="flex items-center space-x-4">
        <Button variant="ghost" size="icon" class="rounded-full hover:bg-gray-100" onclick={() => goto(`/profile/${auth.state.user?.id}`)}>
            <span class="text-2xl">👤</span>
        </Button>
        <Button variant="ghost" class="hidden sm:block" onclick={handleLogout}>Logout</Button>
    </div>

    {#if mobileMenuOpen}
        <div class="md:hidden fixed top-14 left-0 right-0 bottom-0 bg-white z-40 p-4">
            <nav class="flex flex-col space-y-4">
                <a href="/dashboard" class="text-lg font-medium text-gray-700 hover:text-indigo-600" on:click={() => mobileMenuOpen = false}>Dashboard</a>
                <a href="/friends" class="text-lg font-medium text-gray-700 hover:text-indigo-600" on:click={() => mobileMenuOpen = false}>Friends</a>
                <a href="/messages" class="text-lg font-medium text-gray-700 hover:text-indigo-600" on:click={() => mobileMenuOpen = false}>Messages</a>
                <a href="/profile/{auth.state.user?.id}" class="text-lg font-medium text-gray-700 hover:text-indigo-600" on:click={() => mobileMenuOpen = false}>Profile</a>
                <Button variant="ghost" class="w-full" on:click={handleLogout}>Logout</Button>
            </nav>
        </div>
    {/if}
</header>
