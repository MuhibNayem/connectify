<script lang="ts">
  import { onMount } from 'svelte';
  import { notifications, setLoading, setError, markNotificationAsRead, setNotifications } from '../../stores/notifications';
  import { fetchNotifications, getUnreadNotificationCount, markNotificationAsRead as apiMarkAsRead } from '$lib/api';
  import { auth } from '$lib/stores/auth.svelte';
  import { formatDistanceToNow } from 'date-fns';

  let currentPage = 1;
  let limit = 10;
  let totalNotifications = 0;

  async function loadNotifications() {
    setLoading(true);
    setError(null);
    try {
      if (!auth.state.user) {
        setError('User not authenticated.');
        return;
      }

      const response = await fetchNotifications(currentPage, limit);
      const unreadCountResponse = await getUnreadNotificationCount();

      console.log('Fetched notifications:', response);
      console.log('Unread count:', unreadCountResponse);

      setNotifications(response.notifications, unreadCountResponse.count);
      totalNotifications = response.total;
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    try {
      await apiMarkAsRead(notificationId);
      markNotificationAsRead(notificationId); // Update store
    } catch (err: any) {
      setError(err.message || 'Failed to mark notification as read.');
    }
  }

  onMount(() => {
    loadNotifications();
  });

  // Function to determine notification message based on type and data
  function getNotificationMessage(notification: typeof $notifications.notifications[0]): string {
    const senderUsername = notification.data?.sender_username || 'Someone';
    const targetType = notification.data?.target_type || 'content';
    const reactionType = notification.data?.reaction_type || 'reacted';

    switch (notification.type) {
      case 'FRIEND_REQUEST':
        return `${senderUsername} sent you a friend request.`
      case 'FRIEND_ACCEPT':
        return `${senderUsername} accepted your friend request.`
      case 'LIKE':
        return `${senderUsername} ${reactionType.toLowerCase()} to your ${targetType}.`;
      case 'COMMENT':
        return `${senderUsername} commented on your ${targetType}.`;
      case 'REPLY':
        return `${senderUsername} replied to your ${targetType}.`;
      case 'MENTION':
        return `${senderUsername} mentioned you in a ${targetType}.`;
      default:
        return notification.content || 'New notification';
    }
  }
</script>

<div class="notification-list p-4 bg-white shadow-lg rounded-lg max-h-96 overflow-y-auto">
  <h2 class="text-xl font-bold mb-4">Notifications</h2>

  {#if $notifications.isLoading}
    <p>Loading notifications...</p>
  {:else if $notifications.error}
    <p class="text-red-500">Error: {$notifications.error}</p>
  {:else if $notifications?.notifications?.length === 0}
    <p>No notifications yet.</p>
  {:else}
    <ul>
      {#each $notifications?.notifications as notification (notification?.id)}
        <li class="flex items-center p-3 mb-2 rounded-md {notification?.read ? 'bg-gray-100' : 'bg-blue-50'}">
          {#if notification.data?.sender_avatar}
            <img src={notification?.data.sender_avatar} alt="{notification?.data.sender_username}" class="w-8 h-8 rounded-full mr-3" />
          {:else}
            <div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-3 text-gray-600 text-sm font-bold">👤</div>
          {/if}
          <div class="flex-grow">
            <p class="text-sm {notification.read ? 'text-gray-600' : 'font-medium text-gray-900'}">
              {getNotificationMessage(notification)}
            </p>
            <span class="text-xs text-gray-500">
              { notification.created_at ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true }) : '' }
            </span>
          </div>
          {#if !notification.read}
            <button
              onclick={() => handleMarkAsRead(notification.id)}
              class="ml-4 px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200"
            >
              Mark as Read
            </button>
          {/if}
        </li>
      {/each}
    </ul>

    {#if $notifications?.notifications?.length < totalNotifications}
      <button
        onclick={() => {
          currentPage++;
          loadNotifications();
        }}
        class="mt-4 w-full py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
      >
        Load More
      </button>
    {/if}
  {/if}
</div>

<style>
  .notification-list {
    max-width: 400px; /* Adjust as needed */
  }
</style>