<script lang="ts">
    import AppHeader from '$lib/components/layout/AppHeader.svelte';
    import ConversationList from '$lib/components/messages/ConversationList.svelte';
    import ChatWindow from '$lib/components/messages/ChatWindow.svelte';
    import { page } from '$app/stores';

    $: conversationId = $page.params.id;
</script>

<div class="flex flex-col min-h-screen bg-gray-100 font-sans">
    <AppHeader />

    <div class="flex flex-1 pt-14"> <!-- pt-14 to account for fixed header height -->
        <!-- Main Messaging Layout -->
        <main class="flex-1 flex flex-col md:flex-row">
            <!-- Left Pane: Conversation List -->
            <aside class="w-full md:w-1/3 lg:w-1/3 bg-white border-r border-gray-200 shadow-md overflow-y-auto">
                <ConversationList selectedConversationId={conversationId} />
            </aside>

            <!-- Right Pane: Chat Window -->
            <section class="flex-1 flex flex-col bg-white">
                <ChatWindow conversationId={conversationId} />
            </section>
        </main>
    </div>
</div>