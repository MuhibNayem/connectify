<!--
Component for the message input field at the bottom of the chat window.
-->
<script lang="ts">
    import { sendWebSocketMessage } from '$lib/websocket';

    export let onSendMessage: (content: string) => Promise<void>;

    let content = '';
    let isSending = false;

    // Typing indicator logic
    let typingTimer: any;
    function handleTyping() {
        clearTimeout(typingTimer);
        sendWebSocketMessage('typing', { isTyping: true });
        typingTimer = setTimeout(() => {
            sendWebSocketMessage('typing', { isTyping: false });
        }, 2000); // Consider user as "stopped typing" after 2 seconds
    }

    async function handleSubmit() {
        if (!content.trim() || isSending) return;

        isSending = true;
        try {
            await onSendMessage(content);
            content = ''; // Clear input on successful send
        } catch (error) {
            console.error("Failed to send message:", error);
            // Optionally, show an error to the user
        } finally {
            isSending = false;
        }
    }
</script>

<form on:submit|preventDefault={handleSubmit} class="p-4 bg-white border-t border-gray-200">
    <div class="flex items-center">
        <!-- Future: Add buttons for attachments, emojis, etc. here -->
        <textarea
            bind:value={content}
            disabled={isSending}
            on:input={handleTyping}
            on:keydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            rows="1"
            class="flex-1 mx-4 p-2.5 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 resize-none"
            placeholder="Type a message..."
        ></textarea>
        <button
            type="submit"
            disabled={isSending || !content.trim()}
            class="inline-flex justify-center p-2 text-blue-600 rounded-full cursor-pointer hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <svg class="w-6 h-6 rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
            </svg>
            <span class="sr-only">Send message</span>
        </button>
    </div>
</form>