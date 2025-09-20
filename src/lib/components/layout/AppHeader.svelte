<script lang="ts">
	import { goto } from '$app/navigation';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import SearchInput from '$lib/components/ui/search/SearchInput.svelte';
    import NotificationList from '../notifications/NotificationList.svelte';
    import { notifications } from '../../stores/notifications';

    let showNotifications = false;

    function handleSearchSubmit(event: CustomEvent<string>) {
        const query = event.detail;
        goto(`/search?query=${encodeURIComponent(query)}`);
    }

    function toggleNotifications() {
        showNotifications = !showNotifications;
    }
</script>

<header class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 bg-white shadow-md border-b border-gray-200">
    <!-- Left: Logo/App Name -->
    <div class="flex items-center space-x-4">
        <a href="/dashboard" class="text-2xl font-bold text-indigo-600">Connectify</a>
        <!-- Search Bar (visible on larger screens) -->
        <div class="hidden md:block relative flex-grow max-w-md">
            <SearchInput on:search={handleSearchSubmit} />
        </div>
    </div>

    <!-- Center: Navigation Icons (visible on larger screens) -->
    <nav class="hidden md:flex items-center space-x-6">
        <Button variant="ghost" size="icon" class="rounded-full hover:bg-gray-100" onclick = {() => goto('/dashboard')}>
            <!-- <Home size={24} /> -->
            <span class="text-2xl">🏠</span>
        </Button>
        <Button variant="ghost" size="icon" class="rounded-full hover:bg-gray-100" onclick = {() => goto('/friends')}>
            <!-- <Users size={24} /> -->
            <span class="text-2xl">👥</span>
        </Button>
        <Button variant="ghost" size="icon" class="rounded-full hover:bg-gray-100" onclick = {() => goto('/messages')}>
            <!-- <MessageCircle size={24} /> -->
            <span class="text-2xl">💬</span>
        </Button>
        <div class="relative">
            <Button variant="ghost" size="icon" class="rounded-full hover:bg-gray-100" onclick={toggleNotifications}>
                <!-- <Bell size={24} /> -->
                <span class="text-2xl">🔔</span>
                {#if $notifications.unreadCount > 0}
                    <span class="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                        {$notifications.unreadCount}
                    </span>
                {/if}
            </Button>
            {#if showNotifications}
                <div class="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50">
                    <NotificationList />
                </div>
            {/if}
        </div>
    </nav>

    <!-- Right: User Profile/Actions -->
    <div class="flex items-center space-x-4">
        <Button variant="ghost" size="icon" class="rounded-full hover:bg-gray-100">
            <!-- <UserCircle size={24} /> -->
            <span class="text-2xl">👤</span>
        </Button>
        <!-- More actions like settings, logout can go here -->
        <Button variant="ghost" class="hidden sm:block">Logout</Button>
    </div>
</header>
