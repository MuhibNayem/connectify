<script lang="ts">
    // Assuming you have icons like User, Users, Group, Calendar, ShoppingBag, etc.
    // import { User, Users, Group, Calendar, ShoppingBag } from 'lucide-svelte';
</script>

<div class="space-y-4">
    <!-- User Profile Link -->
    <a href="/profile" class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">JD</div>
        <span class="text-gray-800 font-medium">John Doe</span>
    </a>

    <!-- Main Navigation Links -->
    <nav class="space-y-1">
        <a href="/friends" class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <!-- <Users size={20} /> -->
            <span class="text-xl">👥</span>
            <span class="text-gray-700">Friends</span>
        </a>
        <a href="/groups" class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <!-- <Group size={20} /> -->
            <span class="text-xl">🏘️</span>
            <span class="text-gray-700">Groups</span>
        </a>
        <a href="/events" class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <!-- <Calendar size={20} /> -->
            <span class="text-xl">🗓️</span>
            <span class="text-gray-700">Events</span>
        </a>
        <a href="/marketplace" class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <!-- <ShoppingBag size={20} /> -->
            <span class="text-xl">🛍️</span>
            <span class="text-gray-700">Marketplace</span>
        </a>
        <!-- Add more links as needed -->
    </nav>

    <!-- Separator -->
    <hr class="border-gray-200" />

    <!-- Shortcuts/More -->
    <div class="space-y-1">
        <h3 class="text-xs font-semibold text-gray-500 uppercase px-2">Your Shortcuts</h3>
        <a href="/shortcut1" class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <div class="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center text-blue-600 text-sm">#1</div>
            <span class="text-gray-700">My Group A</span>
        </a>
        <a href="/shortcut2" class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <div class="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center text-green-600 text-sm">#2</div>
            <span class="text-gray-700">Gaming Community</span>
        </a>
    </div>
</div>
