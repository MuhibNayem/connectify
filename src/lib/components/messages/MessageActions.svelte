<script lang="ts">
	import { deleteMessage, editMessage } from '$lib/api';
	import { createEventDispatcher } from 'svelte';
	import { MoreHorizontal, Edit, Trash2, SmilePlus } from '@lucide/svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import ReactionPicker from './ReactionPicker.svelte';

	let { messageId, messageContent, messageSenderId, messageCreatedAt, onEdited, onDeleted } =
		$props<{
			messageId: string;
			messageContent: string;
			messageSenderId: string;
			messageCreatedAt: string;
			onEdited?: (newContent: string) => void;
			onDeleted?: () => void;
		}>();

	const dispatch = createEventDispatcher();

	let showMenu = $state(false);
	let showReactionPicker = $state(false);
	let isEditing = $state(false);
	let editContent = $state(messageContent);
	let isDeleting = $state(false);

	const isMe = auth.state.user?.id === messageSenderId;

	// Calculate if actions are available based on time restrictions
	const createdTime = $derived(new Date(messageCreatedAt).getTime());
	const canEdit = $derived(() => {
		const oneHourAgo = Date.now() - 60 * 60 * 1000;
		return isMe && createdTime > oneHourAgo;
	});

	const canDelete = $derived(() => {
		const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
		return isMe && createdTime > sevenDaysAgo;
	});

	function toggleMenu() {
		showMenu = !showMenu;
	}

	function startEdit() {
		if (!canEdit()) {
			alert('Messages can only be edited within 1 hour of sending');
			return;
		}
		isEditing = true;
		editContent = messageContent;
		showMenu = false;
	}

	async function saveEdit() {
		if (!editContent.trim()) {
			alert('Message cannot be empty');
			return;
		}
		try {
			const updated = await editMessage(messageId, editContent);
			isEditing = false;
			if (onEdited) {
				onEdited(editContent);
			}
			dispatch('edited', { content: editContent });
		} catch (error: any) {
			alert(error.message || 'Failed to edit message');
		}
	}

	function cancelEdit() {
		isEditing = false;
		editContent = messageContent;
	}

	async function handleDelete() {
		if (!canDelete()) {
			alert('Messages can only be deleted within 7 days of sending');
			return;
		}

		if (!confirm('Are you sure you want to delete this message?')) {
			return;
		}

		isDeleting = true;
		try {
			await deleteMessage(messageId);
			if (onDeleted) {
				onDeleted();
			}
			dispatch('deleted');
		} catch (error: any) {
			alert(error.message || 'Failed to delete message');
		} finally {
			isDeleting = false;
			showMenu = false;
		}
	}

	function toggleReactionPicker() {
		showReactionPicker = !showReactionPicker;
		showMenu = false;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.message-actions-menu') && !target.closest('.message-actions-button')) {
			showMenu = false;
		}
		if (
			!target.closest('.reaction-picker-container') &&
			!target.closest('.reaction-picker-button')
		) {
			showReactionPicker = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

{#if isEditing}
	<div class="mt-2 flex flex-col gap-2">
		<textarea
			bind:value={editContent}
			class="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
			rows="2"
		/>
		<div class="flex gap-2">
			<button
				onclick={saveEdit}
				class="rounded-md bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
			>
				Save
			</button>
			<button
				onclick={cancelEdit}
				class="rounded-md bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
			>
				Cancel
			</button>
		</div>
	</div>
{:else}
	<div class="relative flex items-center gap-1">
		<!-- React Button -->
		<button
			class="reaction-picker-button flex items-center justify-center rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
			onclick={toggleReactionPicker}
			title="Add reaction"
		>
			<SmilePlus size={16} />
		</button>

		<!-- More Actions Button (only for own messages) -->
		{#if isMe}
			<button
				class="message-actions-button flex items-center justify-center rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
				onclick={toggleMenu}
				title="More options"
			>
				<MoreHorizontal size={16} />
			</button>
		{/if}

		<!-- Actions Menu -->
		{#if showMenu && isMe}
			<div
				class="message-actions-menu absolute right-0 top-full z-10 mt-1 min-w-[150px] rounded-lg border border-gray-200 bg-white shadow-lg"
			>
				{#if canEdit()}
					<button
						onclick={startEdit}
						class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
					>
						<Edit size={16} />
						<span>Edit</span>
					</button>
				{:else}
					<button
						disabled
						class="flex w-full cursor-not-allowed items-center gap-2 px-4 py-2 text-left text-sm text-gray-400"
						title="Messages can only be edited within 1 hour"
					>
						<Edit size={16} />
						<span>Edit (expired)</span>
					</button>
				{/if}

				{#if canDelete()}
					<button
						onclick={handleDelete}
						disabled={isDeleting}
						class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
					>
						<Trash2 size={16} />
						<span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
					</button>
				{:else}
					<button
						disabled
						class="flex w-full cursor-not-allowed items-center gap-2 px-4 py-2 text-left text-sm text-gray-400"
						title="Messages can only be deleted within 7 days"
					>
						<Trash2 size={16} />
						<span>Delete (expired)</span>
					</button>
				{/if}
			</div>
		{/if}

		<!-- Reaction Picker -->
		{#if showReactionPicker}
			<div class="reaction-picker-container absolute right-0 top-full z-20 mt-1">
				<ReactionPicker {messageId} on:close={() => (showReactionPicker = false)} />
			</div>
		{/if}
	</div>
{/if}
