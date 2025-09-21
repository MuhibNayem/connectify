<script lang="ts">
    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import { createEventDispatcher } from 'svelte';
    import { sendWebSocketMessage } from '$lib/websocket';

    const dispatch = createEventDispatcher();

    export let conversationId: string; // ID of the current conversation

    let messageContent: string = '';
    let typingTimeout: ReturnType<typeof setTimeout>;

    function handleTyping() {
        sendWebSocketMessage('typing', { conversation_id: conversationId, is_typing: true });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            sendWebSocketMessage('typing', { conversation_id: conversationId, is_typing: false });
        }, 1500); // Send stop typing after 1.5 seconds of no input
    }

    function handleBlur() {
        clearTimeout(typingTimeout);
        sendWebSocketMessage('typing', { conversation_id: conversationId, is_typing: false });
    }

    function sendMessage() {
        if (messageContent.trim()) {
            dispatch('sendMessage', messageContent);
            messageContent = ''; // Clear input after sending
            // Ensure stop typing is sent immediately after sending a message
            clearTimeout(typingTimeout);
            sendWebSocketMessage('typing', { conversation_id: conversationId, is_typing: false });
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent new line in textarea
            sendMessage();
        }
    }
</script>

<div class="flex items-center space-x-2">
    <Input
        type="text"
        placeholder="Type a message..."
        bind:value={messageContent}
        on:input={handleTyping}
        on:blur={handleBlur}
        on:keydown={handleKeyDown}
        class="flex-1 py-2 px-4 rounded-full bg-gray-100 border-none focus:ring-indigo-500 focus:border-indigo-500"
    />
    <Button on:click={sendMessage} class="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-2 size-10">
        <!-- Send icon placeholder -->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send"><path d="m22 2-7 7m7-7-7 7L2 12l7 7 7-7 7 7V2z"/></svg>
    </Button>
</div>
