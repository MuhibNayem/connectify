<script lang="ts">
	// Assuming you have icons like User, Phone, Video, MoreHorizontal from Lucide Svelte
	// import { User, Phone, Video, MoreHorizontal } from 'lucide-svelte';
</script>

<div class="space-y-6">
	<!-- Contacts/Friends Online -->
	<div>
		<h3 class="text-muted-foreground mb-3 text-xs font-semibold uppercase">Contacts</h3>
		<div class="space-y-2">
			<!-- Example Contact -->
			<a
				href="/profile/friend1"
				class="flex items-center space-x-3 rounded-lg p-2 transition-colors hover:bg-white/10"
			>
				<div class="relative">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full bg-green-300 font-bold text-green-600"
					>
						F1
					</div>
					<span
						class="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-2 ring-white"
					></span>
				</div>
				<span class="text-foreground font-medium">Friend One</span>
			</a>
			<a
				href="/profile/friend2"
				class="flex items-center space-x-3 rounded-lg p-2 transition-colors hover:bg-white/10"
			>
				<div class="relative">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-300 font-bold text-blue-600"
					>
						F2
					</div>
					<span
						class="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-2 ring-white"
					></span>
				</div>
				<span class="text-foreground font-medium">Friend Two</span>
			</a>
			<!-- Add more contacts -->
		</div>
	</div>

	<!-- Separator -->
	<hr class="border-white/10" />

	<!-- Sponsored/Suggested Content (Placeholder) -->
	<div>
		<h3 class="text-muted-foreground mb-3 text-xs font-semibold uppercase">Sponsored</h3>
		<div class="space-y-3">
			<div class="glass-card rounded-lg p-3">
				<p class="text-foreground text-sm font-medium">Discover New Features!</p>
				<p class="text-muted-foreground mt-1 text-xs">Explore the latest updates on Connectify.</p>
				<img
					src="https://via.placeholder.com/200x100"
					alt="Sponsored Content"
					class="mt-2 rounded-md"
				/>
			</div>
		</div>
	</div>
</div>
