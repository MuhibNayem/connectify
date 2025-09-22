<!--
Component to display a single message bubble.
It styles messages differently based on whether they were sent by the current user.
-->
<script lang="ts">
    import { auth } from '$lib/stores/auth.svelte';
    import type { Message } from '$lib/types';

    export let message: Message;

    console.log({ message });
    const isMe = auth.state.user?.id === message.sender_id;

    // Function to determine if the message has been seen by the other participant in a 1-1 chat
    // For group chats, this would be more complex (e.g., showing a count or list of viewers)
    function isSeenByOther(msg: Message): boolean {
        if (!auth.state.user || !msg.seen_by) return false;
        // In a 1-1 chat, the 'other' participant is anyone not the current user
        return msg.seen_by.some(userId => userId !== auth.state.user?.id);
    }
</script>

<div class="flex items-start gap-2.5 my-2" class:flex-row-reverse={isMe}>
    <img class="w-8 h-8 rounded-full" src={message.sender?.avatar || `https://i.pravatar.cc/150?u=${message.sender_id}`} alt="{message.sender_name || 'User'}'s avatar" />
    <div class="flex flex-col gap-1 w-full max-w-[320px]">
        <div class="flex items-center space-x-2" class:justify-end={isMe}>
            <span class="text-sm font-semibold text-gray-900">{message?.sender_name || 'User'}</span>
            <span class="text-xs font-normal text-gray-500">{new Date(message.created_at).toLocaleTimeString()}</span>
            {#if isMe && isSeenByOther(message)}
                <svg class="w-3 h-3 text-blue-600 dark:text-blue-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 14">
                    <g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                        <path d="M1 9.857L4.388 13 19 1"/>
                    </g>
                </svg>
            {/if}
        </div>
        <div class="flex flex-col leading-1.5 p-4 border-gray-200" class:bg-blue-500={isMe} class:text-white={isMe} class:rounded-e-xl={!isMe} class:rounded-es-xl={!isMe} class:bg-gray-100={!isMe} class:rounded-s-xl={isMe} class:rounded-ee-xl={isMe}>
            {#if message.content_type === 'TEXT' || message.content_type === 'text'}
                <p class="text-sm font-normal">{message.content}</p>
            {:else if message.content_type === 'IMAGE' || message.content_type === 'image'}
                <img src={message.content} alt="" class="max-w-xs rounded-lg" />
            {:else if message.content_type === 'VIDEO' || message.content_type === 'video'}
                <video src={message.content} controls class="max-w-xs rounded-lg"></video>
            {:else if message.content_type === 'FILE' || message.content_type === 'file'}
                <a href={message.content} target="_blank" rel="noopener noreferrer" class="text-sm font-normal underline">Download File</a>
            {/if}
        </div>
        <div class="flex items-center space-x-2 mt-1" class:justify-end={isMe}>
            {#if message.is_edited}
                <span class="text-xs font-normal text-gray-400">Edited</span>
            {/if}
            {#if message.reactions && message.reactions.length > 0}
                <div class="flex items-center bg-gray-100 rounded-full px-2 py-0.5">
                    {#each message.reactions as reaction}
                        <span>{reaction.emoji}</span>
                    {/each}
                    <span class="text-xs text-gray-600 ml-1">{message.reactions.length}</span>
                </div>
            {/if}
        </div>
    </div>
</div>
