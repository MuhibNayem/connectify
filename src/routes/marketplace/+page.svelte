<script lang="ts">
	import {
		Search,
		Bell,
		Inbox,
		ShoppingBag,
		Tag,
		Plus,
		MapPin,
		Settings,
		Store
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import MarketplaceCard from '$lib/components/marketplace/MarketplaceCard.svelte';

	let activeTab = $state('browse');
	let searchQuery = $state('');

	const sidebarItems = [
		{ id: 'browse', label: 'Browse all', icon: Store },
		{ id: 'notifications', label: 'Notifications', icon: Bell },
		{ id: 'inbox', label: 'Inbox', icon: Inbox },
		{ id: 'buying', label: 'Buying', icon: ShoppingBag },
		{ id: 'selling', label: 'Selling', icon: Tag }
	];

	// Mock Items
	const items = [
		{
			id: 1,
			title: 'Vintage Film Camera Canon AE-1',
			price: 150,
			location: 'Dhaka',
			image:
				'https://images.pexels.com/photos/593322/pexels-photo-593322.jpeg?auto=compress&cs=tinysrgb&w=300'
		},
		{
			id: 2,
			title: 'MacBook Pro M1 2020 - Good Condition',
			price: 900,
			location: 'Chittagong',
			image:
				'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=300'
		},
		{
			id: 3,
			title: 'Minimalist Wooden Chair',
			price: 45,
			location: 'Sylhet',
			image:
				'https://images.pexels.com/photos/116910/pexels-photo-116910.jpeg?auto=compress&cs=tinysrgb&w=300'
		},
		{
			id: 4,
			title: 'Mechanical Keyboard keycaps',
			price: 25,
			location: 'Dhaka',
			image:
				'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=300'
		},
		{
			id: 5,
			title: 'Sony WH-1000XM4 Headphones',
			price: 200,
			location: 'Rajshahi',
			image:
				'https://images.pexels.com/photos/1649771/pexels-photo-1649771.jpeg?auto=compress&cs=tinysrgb&w=300'
		},
		{
			id: 6,
			title: 'IKEA Desk Lamp',
			price: 15,
			location: 'Dhaka',
			image:
				'https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?auto=compress&cs=tinysrgb&w=300'
		},
		{
			id: 7,
			title: 'Gaming PC Setup (RTX 3060)',
			price: 1200,
			location: 'Comilla',
			image:
				'https://images.pexels.com/photos/777001/pexels-photo-777001.jpeg?auto=compress&cs=tinysrgb&w=300'
		},
		{
			id: 8,
			title: 'Leather Jacket',
			price: 80,
			location: 'Dhaka',
			image:
				'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=300'
		},
		{
			id: 9,
			title: 'Succulent Plants Set',
			price: 20,
			location: 'Khulna',
			image:
				'https://images.pexels.com/photos/796620/pexels-photo-796620.jpeg?auto=compress&cs=tinysrgb&w=300'
		},
		{
			id: 10,
			title: 'Fixie Bike Custom',
			price: 300,
			location: 'Dhaka',
			image:
				'https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg?auto=compress&cs=tinysrgb&w=300'
		}
	];
</script>

<div class="flex min-h-screen bg-transparent pt-14 font-sans">
	<!-- Left Sidebar (Sticky) -->
	<aside
		class="bg-background/50 fixed left-0 top-14 hidden h-[calc(100vh-56px)] w-[360px] overflow-y-auto border-r border-white/10 p-4 backdrop-blur-xl lg:block"
	>
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-2xl font-bold">Marketplace</h1>
			<Button variant="ghost" size="icon" class="rounded-full bg-white/5 hover:bg-white/10">
				<Settings size={20} />
			</Button>
		</div>

		<!-- Search Input -->
		<div class="relative mb-6">
			<Search class="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" size={18} />
			<input
				type="text"
				placeholder="Search Marketplace"
				class="focus:ring-primary/50 w-full rounded-full bg-white/10 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2"
				bind:value={searchQuery}
			/>
		</div>

		<nav class="mb-6 space-y-1">
			{#each sidebarItems as item}
				<button
					class="flex w-full items-center space-x-3 rounded-lg p-3 transition-colors {activeTab ===
					item.id
						? 'bg-primary/10 text-primary'
						: 'hover:bg-white/5'}"
					onclick={() => (activeTab = item.id)}
				>
					<div
						class="rounded-full bg-white/10 p-2 {activeTab === item.id
							? 'bg-primary text-white'
							: ''}"
					>
						<item.icon size={20} />
					</div>
					<span class="text-lg font-medium">{item.label}</span>
				</button>
			{/each}
		</nav>

		<Button
			class="mb-6 w-full gap-2 border border-blue-200 bg-blue-100 text-blue-600 hover:bg-blue-200"
		>
			<Plus size={20} /> Create new listing
		</Button>

		<hr class="mb-6 border-white/10" />

		<div class="mb-4 flex items-center justify-between px-2">
			<h3 class="text-lg font-semibold">Filters</h3>
			<button class="text-primary text-sm hover:underline">Reset</button>
		</div>

		<div class="space-y-2 px-2">
			<button class="text-primary flex w-full items-center justify-between text-left font-medium">
				<span>Dhaka • Within 60 km</span>
			</button>
		</div>
	</aside>

	<!-- Main Content -->
	<main class="flex-1 p-4 md:p-8 lg:pl-[360px]">
		<div class="mx-auto max-w-7xl">
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-xl font-bold">Today's picks</h2>
				<button class="text-primary flex items-center gap-1 hover:underline">
					<MapPin size={16} /> Dhaka · 60 km
				</button>
			</div>

			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
				{#each items as item}
					<MarketplaceCard {item} />
				{/each}
			</div>
		</div>
	</main>
</div>
