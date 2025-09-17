<script lang="ts">
	import { goto } from '$app/navigation';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import SearchInput from '$lib/components/ui/search/SearchInput.svelte';
    // Assuming you have icons like Bell, MessageCircle, Home, Users, UserCircle from a library like Lucide Svelte
    // import { Bell, MessageCircle, Home, Users, UserCircle, Search } from 'lucide-svelte';

    function handleSearchSubmit(event: CustomEvent<string>) {
        const query = event.detail;
        goto(`/search?query=${encodeURIComponent(query)}`);
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
        <Button variant="ghost" size="icon" class="rounded-full hover:bg-gray-100" onclick = {() => goto('/notifications')}>
            <!-- <Bell size={24} /> -->
            <span class="text-2xl">🔔</span>
        </Button>
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
