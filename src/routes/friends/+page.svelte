<script lang="ts">
    import AppHeader from '$lib/components/layout/AppHeader.svelte';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
    import FriendListTab from '$lib/components/friends/FriendListTab.svelte';
    import FriendRequestsTab from '$lib/components/friends/FriendRequestsTab.svelte';
</script>

<div class="flex flex-col min-h-screen bg-gray-100 font-sans">
    <AppHeader />

    <main class="flex-1 p-4 md:p-6 pt-14 md:pt-14"> <!-- Adjust padding-top for fixed header -->
        <div class="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
            <h1 class="text-3xl font-bold text-gray-900 mb-6">Friends</h1>

            <Tabs value="friend-list" class="w-full">
                <TabsList class="grid w-full grid-cols-2">
                    <TabsTrigger value="friend-list">Friend List</TabsTrigger>
                    <TabsTrigger value="friend-requests">Friend Requests</TabsTrigger>
                </TabsList>
                <TabsContent value="friend-list" class="mt-6">
                    <FriendListTab />
                </TabsContent>
                <TabsContent value="friend-requests" class="mt-6">
                    <FriendRequestsTab />
                </TabsContent>
            </Tabs>
        </div>
    </main>
</div>
