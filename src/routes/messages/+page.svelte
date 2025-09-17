<script lang="ts">
    import AppHeader from '$lib/components/layout/AppHeader.svelte';
    import ConversationList from '$lib/components/messages/ConversationList.svelte';
</script>

<div class="flex flex-col min-h-screen bg-gray-100 font-sans">
    <AppHeader />

    <div class="flex flex-1 pt-14"> <!-- pt-14 to account for fixed header height -->
        <!-- Main Messaging Layout -->
        <main class="flex-1 flex flex-col md:flex-row">
            <!-- Left Pane: Conversation List -->
            <aside class="w-full md:w-1/3 lg:w-1/3 bg-white border-r border-gray-200 shadow-md overflow-y-auto">
                <ConversationList />
            </aside>

            <!-- Right Pane: Empty Chat Window (or instructions) -->
            <section class="flex-1 flex items-center justify-center bg-gray-50 p-4">
                <div class="text-center text-gray-500">
                    <h2 class="text-2xl font-semibold">Select a chat to start messaging</h2>
                    <p class="mt-2">Your conversations will appear here.</p>
                </div>
            </section>
        </main>
    </div>
</div>