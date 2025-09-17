<script lang="ts">
    // Assuming you have icons like User, Phone, Video, MoreHorizontal from Lucide Svelte
    // import { User, Phone, Video, MoreHorizontal } from 'lucide-svelte';
</script>

<div class="space-y-6">
    <!-- Contacts/Friends Online -->
    <div>
        <h3 class="text-xs font-semibold text-gray-500 uppercase mb-3">Contacts</h3>
        <div class="space-y-2">
            <!-- Example Contact -->
            <a href="/profile/friend1" class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="relative">
                    <div class="w-8 h-8 bg-green-300 rounded-full flex items-center justify-center text-green-600 font-bold">F1</div>
                    <span class="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-2 ring-white"></span>
                </div>
                <span class="text-gray-800 font-medium">Friend One</span>
            </a>
            <a href="/profile/friend2" class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="relative">
                    <div class="w-8 h-8 bg-blue-300 rounded-full flex items-center justify-center text-blue-600 font-bold">F2</div>
                    <span class="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-2 ring-white"></span>
                </div>
                <span class="text-gray-800 font-medium">Friend Two</span>
            </a>
            <!-- Add more contacts -->
        </div>
    </div>

    <!-- Separator -->
    <hr class="border-gray-200" />

    <!-- Sponsored/Suggested Content (Placeholder) -->
    <div>
        <h3 class="text-xs font-semibold text-gray-500 uppercase mb-3">Sponsored</h3>
        <div class="space-y-3">
            <div class="bg-gray-50 p-3 rounded-lg shadow-sm">
                <p class="text-sm font-medium text-gray-800">Discover New Features!</p>
                <p class="text-xs text-gray-600 mt-1">Explore the latest updates on Connectify.</p>
                <img src="https://via.placeholder.com/200x100" alt="Sponsored Content" class="mt-2 rounded-md" />
            </div>
        </div>
    </div>
</div>
