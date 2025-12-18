<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import * as Icons from '@lucide/svelte';
	import ProductCard from '$lib/components/marketplace/ProductCard.svelte';
	import FilterSidebar from '$lib/components/marketplace/FilterSidebar.svelte';
	import CreateListingModal from '$lib/components/marketplace/CreateListingModal.svelte';
	import ProductDetailsModal from '$lib/components/marketplace/ProductDetailsModal.svelte';
	import { getProducts } from '$lib/api/marketplace';
	import type { Product, ProductFilter } from '$lib/api/marketplace';
	import { auth } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { sendMessage } from '$lib/api';

	let products: Product[] = [];
	let loading = true;
	let searchQuery = '';
	let activeCategoryId: string | undefined;

	// Modal State
	let showCreateModal = false;
	let selectedProduct: Product | null = null;

	// Navigation State
	let activeTab = 'browse'; // 'browse', 'selling', 'inbox', 'saved'

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

	onMount(() => {
		loadProducts();
	});

	function handleSearch() {
		loadProducts({ q: searchQuery, category_id: activeCategoryId });
	}

	function handleFilter(event: CustomEvent) {
		const filter = event.detail;
		activeCategoryId = filter.category_id;
		loadProducts({ ...filter, q: searchQuery });
	}

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

		try {
			await sendMessage({
				receiver_id: product.seller.id,
				content: `Is this available?`,
				content_type: 'product',
				product_id: product.id
			});
			// Close modal if open
			selectedProduct = null;
			goto('/messages');
		} catch (err) {
			console.error('Failed to send message:', err);
			alert('Failed to send message');
		}
	}

	function handleProductClick(event: CustomEvent) {
		selectedProduct = event.detail.product;
	}

	function handleListingCreated() {
		loadProducts(); // Refresh list
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

	<!-- Sidebar (Filters & Categories) -->
	<div class="hidden h-full w-80 overflow-y-auto border-r border-gray-200 bg-white md:block">
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

			<!-- Navigation Tabs (Mobile-like but in sidebar for desktop) -->
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
					on:click={() => (activeTab = 'inbox')}
				>
					Inbox
				</button>
			</div>

			<div class="my-4 border-t border-gray-200"></div>

			<button
				class="mb-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-100 py-2.5 font-semibold text-blue-700 transition-colors hover:bg-blue-200"
				on:click={() => (showCreateModal = true)}
			>
				<Icons.Plus size={20} />
				Create New Listing
			</button>
		</div>

		<!-- Filter Component -->
		<FilterSidebar on:filter={handleFilter} {activeCategoryId} />
	</div>

	<!-- Main Content Area -->
	<div class="flex-1 overflow-y-auto p-4 md:p-8">
		<div class="mx-auto max-w-7xl">
			{#if activeTab === 'browse'}
				<div class="mb-6 flex items-center justify-between">
					<h2 class="text-xl font-bold text-gray-900">Today's Picks</h2>
					<!-- <span class="text-sm text-gray-500">{products.length} Recommended results</span> -->
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
			{:else if activeTab === 'inbox'}
				<div class="flex h-full flex-col items-center justify-center text-gray-500">
					<Icons.MessageSquare size={48} class="mb-4" />
					<p>Marketplace Inbox Coming Soon</p>
					<p class="mt-2 max-w-md text-center text-sm">
						Currently, all marketplace conversations are handled in your main Messages inbox. We are
						working on a dedicated view for buying and selling chats.
					</p>
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
</div>
