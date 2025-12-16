<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { connectWebSocket, disconnectWebSocket } from '$lib/websocket';
	import { getUnreadNotificationCount } from '$lib/api';
	import { setUnreadCount } from '$lib/stores/notifications';
	import '../app.css';
	import Toast from '$lib/components/ui/toast/Toast.svelte';
	import CallContainer from '$lib/components/messages/CallContainer.svelte';

	onMount(() => {
		auth.initialize();
	});

	// Reactive effect to manage WebSocket connection and fetch initial data
	$effect(() => {
		if (auth.state.user) {
			connectWebSocket();

			// Fetch initial unread count
			(async () => {
				try {
					const response = await getUnreadNotificationCount();
					setUnreadCount(response.count);
				} catch (error) {
					console.error('Failed to fetch initial unread notification count:', error);
				}
			})();
		} else {
			disconnectWebSocket();
		}
	});
</script>

<Toast />
<CallContainer />

<slot />
