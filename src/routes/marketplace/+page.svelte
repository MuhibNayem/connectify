<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import * as Icons from '@lucide/svelte';
	import ProductCard from '$lib/components/marketplace/ProductCard.svelte';
	import FilterSidebar from '$lib/components/marketplace/FilterSidebar.svelte';
	import CreateListingModal from '$lib/components/marketplace/CreateListingModal.svelte';
	import ProductDetailsModal from '$lib/components/marketplace/ProductDetailsModal.svelte';
	import { getProducts, getMarketplaceConversations } from '$lib/api/marketplace';
	import type { Product, ProductFilter } from '$lib/api/marketplace';
	import type { ConversationSummary } from '$lib/api';
	import { auth } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { sendMessage } from '$lib/api';
	import ChatWindow from '$lib/components/messages/ChatWindow.svelte';
	import { formatDistanceToNow } from 'date-fns';

	let products: Product[] = [];
	let loading = true;
	let searchQuery = '';
	let activeCategoryId: string | undefined;

	// Modal State
	let showCreateModal = false;
	let selectedProduct: Product | null = null;

	// Navigation State
	let activeTab = 'browse'; // 'browse', 'selling', 'inbox', 'saved'

	// Inbox State
	let conversations: ConversationSummary[] = [];
	let selectedConversationId: string | null = null;
	let loadingConversations = false;

	async function loadProducts(filter: ProductFilter = {}) {
		loading = true;
		try {
			const res = await getProducts(filter);
			products = res.products;
		} catch (err) {
			console.error('Failed to load products:', err);
		} finally {
			loading = false;
		}
	}

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

	onMount(() => {
		loadProducts();
	});

	function handleSearch() {
		// If in inbox, search conversations? For now only products.
		if (activeTab === 'inbox') return;
		loadProducts({ q: searchQuery, category_id: activeCategoryId });
	}

	function handleFilter(event: CustomEvent) {
		const filter = event.detail;
		activeCategoryId = filter.category_id;
		loadProducts({ ...filter, q: searchQuery });
	}

	let initialProductForChat: Product | null = null;
	let initialMessageForChat: string = '';

	async function handleMessageSeller(event: CustomEvent) {
		const { product } = event.detail;
		if (!auth.state.user) {
			alert('Please log in to message seller');
			return;
		}
		if (product.seller && product.seller.id === auth.state.user.id) {
			alert('You cannot message yourself');
			return;
		}

		// Prepare context for ChatWindow
		initialProductForChat = product;
		initialMessageForChat = `Is this available?`;

		// Close modal
		selectedProduct = null;

		// Switch to Inbox
		activeTab = 'inbox';
		await loadConversations();

		// Check if conversation exists
		const sellerId = product.seller.id;
		const existingConv = conversations.find((c) => c.id === sellerId);

		if (existingConv) {
			selectedConversationId = `user-${existingConv.id}`;
		} else {
			// Optimistically add new conversation to the list
			const newConv: ConversationSummary = {
				id: sellerId,
				name: product.seller.username || 'Seller', // Fallback or use full name if available
				avatar: product.seller.avatar,
				is_group: false,
				unread_count: 0,
				last_message_content: 'Drafting inquiry...',
				last_message_timestamp: new Date().toISOString()
			};
			conversations = [newConv, ...conversations];
			selectedConversationId = `user-${sellerId}`;
		}
	}

	function handleProductClick(event: CustomEvent) {
		selectedProduct = event.detail.product;
	}

	function handleListingCreated() {
		loadProducts(); // Refresh list
	}

	// Watch for tab changes
	$: if (activeTab === 'inbox') {
		loadConversations();
	}
</script>

<div class="flex h-screen overflow-hidden bg-[#f0f2f5]">
	<!-- Modals -->
	{#if showCreateModal}
		<CreateListingModal
			on:close={() => (showCreateModal = false)}
			on:success={handleListingCreated}
		/>
	{/if}

	{#if selectedProduct}
		<ProductDetailsModal
			product={selectedProduct}
			on:close={() => (selectedProduct = null)}
			on:message={handleMessageSeller}
		/>
	{/if}

	<!-- Sidebar (Filters & Categories) - Hide if in Inbox mode and a chat is selected on mobile? -->
	<!-- Only show Sidebar on Browse Mode OR Desktop -->
	<div
		class="{activeTab === 'inbox'
			? 'hidden'
			: 'hidden md:block'} h-full w-80 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white"
	>
		<div class="sticky top-0 z-10 bg-white p-4">
			<h1 class="mb-4 text-2xl font-bold text-gray-900">Marketplace</h1>

			<!-- Search -->
			<div class="relative mb-4">
				<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
					<Icons.Search class="text-gray-400" size={20} />
				</div>
				<input
					type="text"
					placeholder="Search Marketplace"
					bind:value={searchQuery}
					on:keydown={(e) => e.key === 'Enter' && handleSearch()}
					class="w-full rounded-full border-none bg-gray-100 py-2 pl-10 pr-4 text-gray-900 transition-all placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<!-- Navigation Tabs -->
			<div class="mb-2 flex gap-2 overflow-x-auto pb-2">
				<button
					class="whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors {activeTab ===
					'browse'
						? 'bg-blue-100 text-blue-600'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					on:click={() => {
						activeTab = 'browse';
						loadProducts({});
					}}
				>
					Browse
				</button>
				<button
					class="whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors {activeTab ===
					'selling'
						? 'bg-blue-100 text-blue-600'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					on:click={() => (activeTab = 'selling')}
				>
					Selling
				</button>
				<button
					class="whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors {activeTab ===
					'inbox'
						? 'bg-blue-100 text-blue-600'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					on:click={() => {
						activeTab = 'inbox';
						selectedConversationId = null;
					}}
				>
					Inbox
				</button>
			</div>

			<div class="my-4 border-t border-gray-200"></div>

			{#if activeTab === 'browse'}
				<button
					class="mb-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-100 py-2.5 font-semibold text-blue-700 transition-colors hover:bg-blue-200"
					on:click={() => (showCreateModal = true)}
				>
					<Icons.Plus size={20} />
					Create New Listing
				</button>

				<!-- Filter Component -->
				<FilterSidebar on:filter={handleFilter} {activeCategoryId} />
			{/if}
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="relative flex h-full flex-1 flex-col overflow-hidden">
		{#if activeTab === 'browse'}
			<div class="h-full overflow-y-auto p-4 md:p-8">
				<div class="mx-auto max-w-7xl">
					<div class="mb-6 flex items-center justify-between">
						<h2 class="text-xl font-bold text-gray-900">Today's Picks</h2>
					</div>

					{#if loading}
						<div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{#each Array(8) as _}
								<div class="h-80 animate-pulse rounded-xl bg-white shadow-sm"></div>
							{/each}
						</div>
					{:else if products.length === 0}
						<div class="flex flex-col items-center justify-center py-20 text-gray-500">
							<Icons.ShoppingBag size={48} class="mb-4 opacity-50" />
							<p class="text-lg font-medium">No items found</p>
							<p class="text-sm">Try adjusting your filters or search query</p>
						</div>
					{:else}
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{#each products as product (product.id)}
								<div in:fade={{ duration: 200 }}>
									<ProductCard
										{product}
										on:message={handleMessageSeller}
										on:click={handleProductClick}
									/>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{:else if activeTab === 'inbox'}
			<!-- Marketplace Inbox Split View -->
			<div class="flex h-full w-full">
				<!-- Conversation List -->
				<div
					class="{selectedConversationId
						? 'hidden md:flex'
						: 'flex'} h-full w-full flex-col border-r border-gray-200 bg-white md:w-80 lg:w-96"
				>
					<div
						class="flex items-center justify-between border-b border-gray-200 p-4 text-lg font-bold"
					>
						<span>Marketplace Chats</span>
						<!-- Back button for mobile if needed, though Tabs serve as nav -->
						<button
							class="text-gray-500 md:hidden"
							on:click={() => {
								activeTab = 'browse';
							}}
						>
							<Icons.ArrowLeft size={20} />
						</button>
					</div>
					<div class="flex-1 overflow-y-auto">
						{#if loadingConversations}
							<div class="p-4 text-center text-gray-500">Loading chats...</div>
						{:else if conversations.length === 0}
							<div class="p-8 text-center text-gray-500">
								<Icons.MessageSquare size={32} class="mx-auto mb-2 opacity-50" />
								<p>No messages yet.</p>
							</div>
						{:else}
							<ul class="divide-y divide-gray-100">
								{#each conversations as conv}
									<button
										class="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50 {selectedConversationId ===
										`user-${conv.id}`
											? 'bg-blue-50'
											: ''}"
										on:click={() => (selectedConversationId = `user-${conv.id}`)}
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

				<!-- Chat Window -->
				<div
					class="{selectedConversationId
						? 'flex'
						: 'hidden md:flex'} relative h-full flex-1 flex-col bg-gray-50"
				>
					{#if selectedConversationId}
						<div class="absolute left-2 top-2 z-10 md:hidden">
							<button
								class="rounded-full border border-gray-200 bg-white/80 p-2 text-gray-700 shadow-sm backdrop-blur"
								on:click={() => (selectedConversationId = null)}
							>
								<Icons.ChevronLeft size={20} />
							</button>
						</div>
						<ChatWindow
							conversationId={selectedConversationId}
							initialProduct={initialProductForChat}
							initialMessage={initialMessageForChat}
						/>
					{:else}
						<div class="flex h-full flex-col items-center justify-center text-gray-400">
							<Icons.MessageCircle size={48} class="mb-4 opacity-50" />
							<p>Select a conversation to start chatting</p>
						</div>
					{/if}
				</div>
			</div>
		{:else if activeTab === 'selling'}
			<div class="flex h-full flex-col items-center justify-center text-gray-500">
				<Icons.Tag size={48} class="mb-4" />
				<p>Your Listings Application Coming Soon</p>
				<button
					class="mt-4 rounded-full bg-blue-600 px-6 py-2 font-medium text-white"
					on:click={() => {
						activeTab = 'browse';
						showCreateModal = true;
					}}
				>
					Create First Listing
				</button>
			</div>
		{/if}
	</div>
</div>
