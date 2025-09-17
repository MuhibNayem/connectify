<script lang="ts">
    import { goto } from '$app/navigation';
    import { Input } from '$lib/components/ui/input';

    export let selectedConversationId: string | undefined = undefined;

    // Placeholder for conversations
    // In a real app, this would come from an API call
    const conversations = [
        { id: 'user123', type: 'direct', name: 'Alice Smith', lastMessage: 'Hey, how are you?', time: '10m ago', unread: 2 },
        { id: 'group456', type: 'group', name: 'Project Team', lastMessage: 'Meeting at 3 PM.', time: '1h ago', unread: 0 },
        { id: 'user789', type: 'direct', name: 'Bob Johnson', lastMessage: 'See you tomorrow!', time: 'Yesterday', unread: 0 },
    ];

    function selectConversation(id: string) {
        goto(`/messages/${id}`);
    }
</script>

<div class="flex flex-col h-full">
    <div class="p-4 border-b border-gray-200">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Chats</h2>
        <Input type="text" placeholder="Search chats" class="w-full px-3 py-2 rounded-md bg-gray-100 border-none focus:ring-indigo-500 focus:border-indigo-500" />
    </div>

    <div class="flex-1 overflow-y-auto">
        {#each conversations as convo (convo.id)}
            <button
                on:click={() => selectConversation(convo.id)}
                class="flex items-center p-4 space-x-3 w-full text-left border-b border-gray-100 hover:bg-gray-50 transition-colors
                {selectedConversationId === convo.id ? 'bg-indigo-50 hover:bg-indigo-100' : ''}"
            >
                <div class="relative w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-lg">
                    {convo.name.substring(0, 2)}
                    {#if convo.type === 'direct'}
                        <span class="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white"></span>
                    {/if}
                </div>
                <div class="flex-1">
                    <div class="flex justify-between items-center">
                        <h3 class="font-semibold text-gray-900">{convo.name}</h3>
                        <span class="text-xs text-gray-500">{convo.time}</span>
                    </div>
                    <p class="text-sm text-gray-600 truncate">{convo.lastMessage}</p>
                </div>
                {#if convo.unread > 0}
                    <span class="ml-2 px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">{convo.unread}</span>
                {/if}
            </button>
        {/each}
    </div>
</div>
