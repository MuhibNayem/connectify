<script lang="ts">
	import { onMount, tick } from 'svelte';
	import * as Icons from '@lucide/svelte';
	import { getMarketplaceConversations, getProduct } from '$lib/api/marketplace';
	import type { ConversationSummary } from '$lib/api';
	import type { Product } from '$lib/api/marketplace';
	import ChatWindow from '$lib/components/messages/ChatWindow.svelte';
	import ProductDetailsModal from '$lib/components/marketplace/ProductDetailsModal.svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { auth } from '$lib/stores/auth.svelte';
	import { page } from '$app/stores';
	import { goto, replaceState } from '$app/navigation';

	// Inbox State
	let conversations = $state<ConversationSummary[]>([]);
	let selectedConversationId = $state<string | null>(null);
	let loadingConversations = $state(true);

	// Product modal state (for when clicking product in chat)
	let selectedProduct = $state<Product | null>(null);

	// Pre-fill state for new conversations (from URL params)
	let pendingProduct = $state<Product | null>(null);
	let pendingMessage = $state<string>('');

	async function loadConversations() {
		loadingConversations = true;
		try {
			conversations = await getMarketplaceConversations();
		} catch (err) {
			console.error('Failed to load conversations:', err);
		} finally {
			loadingConversations = false;
		}
	}

	onMount(async () => {
		await loadConversations();

		// Check URL for seller/product params (from "Message Seller" click)
		const sellerId = $page.url.searchParams.get('seller');
		const productId = $page.url.searchParams.get('product_id');
		const productTitle = $page.url.searchParams.get('product_title');

		if (sellerId && productId) {
			// Select the conversation with this seller
			selectedConversationId = `user-${sellerId}`;

			// Fetch product details for the pending product attachment
			try {
				pendingProduct = await getProduct(productId);
				pendingMessage = `Hi, is this still available?`;
			} catch (err) {
				console.error('Failed to load product for pre-fill:', err);
				// Still set up the conversation even without product details
				pendingMessage = `Hi, I'm interested in: ${productTitle || 'your product'}`;
			}

			// Clear URL params
			const url = new URL($page.url);
			url.searchParams.delete('seller');
			url.searchParams.delete('product_id');
			url.searchParams.delete('product_title');
			replaceState(url, {});
		}
	});

	function handleCloseProductModal() {
		selectedProduct = null;
	}

	async function handleMessageSeller(event: CustomEvent) {
		const { product } = event.detail;
		if (!auth.state.user) {
			alert('Please log in to message seller');
			return;
		}
		// Close the modal
		selectedProduct = null;
		// Already in inbox, just reload conversations
		await loadConversations();
	}
</script>

<div class="flex h-screen overflow-hidden bg-[#f0f2f5]">
	<!-- Product Details Modal -->
	{#if selectedProduct}
		<ProductDetailsModal
			product={selectedProduct}
			on:close={handleCloseProductModal}
			on:message={handleMessageSeller}
		/>
	{/if}

	<!-- Sidebar with Tabs and Conversation List -->
	<div class="flex h-full w-80 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
		<div class="p-4">
			<h1 class="mb-4 text-2xl font-bold text-gray-900">Marketplace</h1>

			<!-- Navigation Tabs -->
			<div class="mb-4 flex gap-2 overflow-x-auto pb-2">
				<a
					href="/marketplace"
					class="whitespace-nowrap rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
				>
					Browse
				</a>
				<a
					href="/marketplace/selling"
					class="whitespace-nowrap rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
				>
					Selling
				</a>
				<a
					href="/marketplace/inbox"
					class="whitespace-nowrap rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-600 transition-colors"
				>
					Inbox
				</a>
			</div>

			<div class="border-t border-gray-200"></div>
		</div>

		<!-- Conversation List (under tabs in sidebar) -->
		<div class="flex-1 overflow-y-auto">
			{#if loadingConversations}
				<div class="p-4 text-center text-gray-500">Loading chats...</div>
			{:else if conversations.length === 0}
				<div class="p-8 text-center text-gray-500">
					<Icons.MessageSquare size={32} class="mx-auto mb-2 opacity-50" />
					<p>No messages yet.</p>
					<p class="mt-2 text-sm">Start a conversation by messaging a seller!</p>
					<a
						href="/marketplace"
						class="mt-4 inline-block rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
					>
						Browse Products
					</a>
				</div>
			{:else}
				<ul class="divide-y divide-gray-100">
					{#each conversations as conv}
						<button
							class="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50 {selectedConversationId ===
							`user-${conv.id}`
								? 'bg-blue-50'
								: ''}"
							onclick={() => (selectedConversationId = `user-${conv.id}`)}
						>
							<img
								src={conv.avatar || `https://ui-avatars.com/api/?name=${conv.name}`}
								alt=""
								class="h-12 w-12 rounded-full bg-gray-200 object-cover"
							/>
							<div class="min-w-0 flex-1">
								<div class="flex items-baseline justify-between">
									<span class="truncate font-semibold text-gray-900">{conv.name}</span>
									{#if conv.last_message_timestamp}
										<span class="ml-2 whitespace-nowrap text-xs text-gray-500">
											{formatDistanceToNow(new Date(conv.last_message_timestamp), {
												addSuffix: false
											})}
										</span>
									{/if}
								</div>
								<p class="mt-0.5 truncate text-sm text-gray-500">
									{conv.last_message_content || 'Started a chat'}
								</p>
							</div>
						</button>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	<!-- Chat Window (main content area) -->
	<div class="relative flex h-full flex-1 flex-col bg-gray-50">
		{#if selectedConversationId}
			<ChatWindow
				conversationId={selectedConversationId}
				isMarketplace={true}
				initialProduct={pendingProduct}
				initialMessage={pendingMessage}
				onProductClick={async (productId) => {
					// Open product modal instead of navigating
					try {
						const product = await getProduct(productId);
						selectedProduct = product;
					} catch (err) {
						console.error('Failed to load product:', err);
					}
				}}
			/>
		{:else}
			<div class="flex h-full flex-col items-center justify-center text-gray-400">
				<Icons.MessageCircle size={48} class="mb-4 opacity-50" />
				<p>Select a conversation to start chatting</p>
			</div>
		{/if}
	</div>
</div>
