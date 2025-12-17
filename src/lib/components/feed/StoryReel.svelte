<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { Plus } from '@lucide/svelte';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';

	let currentUser = $derived(auth.state.user);

	// Mock data for stories - in a real app this would come from an API
	let stories = [
		{
			id: 1,
			user: { name: 'Sarah', avatar: 'https://i.pravatar.cc/150?u=1' },
			image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80'
		},
		{
			id: 2,
			user: { name: 'Mike', avatar: 'https://i.pravatar.cc/150?u=2' },
			image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&q=80'
		},
		{
			id: 3,
			user: { name: 'Emily', avatar: 'https://i.pravatar.cc/150?u=3' },
			image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80'
		},
		{
			id: 4,
			user: { name: 'David', avatar: 'https://i.pravatar.cc/150?u=4' },
			image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80'
		},
		{
			id: 5,
			user: { name: 'Anna', avatar: 'https://i.pravatar.cc/150?u=5' },
			image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80'
		}
	];
</script>

<div class="relative w-full py-4">
	<div class="no-scrollbar flex space-x-2 overflow-x-auto pb-2">
		<!-- Create Story Card -->
		<div
			class="glass-card group relative h-48 w-32 flex-shrink-0 cursor-pointer overflow-hidden rounded-xl transition-transform hover:scale-[1.02]"
		>
			<div class="absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
			{#if currentUser}
				<img
					src={currentUser.avatar || 'https://github.com/shadcn.png'}
					alt="Your Story"
					class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
				/>
				<div class="absolute bottom-0 left-0 right-0 flex flex-col items-center p-2">
					<div
						class="bg-primary relative -mt-6 mb-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-black/20 text-white shadow-lg"
					>
						<Plus size={16} strokeWidth={3} />
					</div>
					<span class="text-xs font-semibold text-white">Create Story</span>
				</div>
			{/if}
		</div>

		<!-- Friends Stories -->
		{#each stories as story (story.id)}
			<div
				class="glass-card group relative h-48 w-32 flex-shrink-0 cursor-pointer overflow-hidden rounded-xl transition-transform hover:scale-[1.02]"
			>
				<div class="absolute inset-0 z-10 bg-gradient-to-b from-transparent to-black/60"></div>
				<img
					src={story.image}
					alt="{story.user.name}'s story"
					class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
				/>
				<div class="border-primary/50 absolute left-2 top-2 z-20 rounded-full border-4 p-[2px]">
					<Avatar class="h-8 w-8 border-2 border-black">
						<AvatarImage src={story.user.avatar} />
						<AvatarFallback>{story.user.name[0]}</AvatarFallback>
					</Avatar>
				</div>
				<span
					class="absolute bottom-2 left-2 z-20 text-xs font-bold text-white shadow-black/50 drop-shadow-md"
				>
					{story.user.name}
				</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
