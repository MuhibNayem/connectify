<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { apiRequest } from '$lib/api';
    import { Card, CardContent, CardFooter, CardHeader } from '$lib/components/ui/card';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Button } from '$lib/components/ui/button';
    import { Label } from '$lib/components/ui/label';
    import { CustomSelect } from '$lib/components/ui/custom-select'; // Import CustomSelect

    const dispatch = createEventDispatcher();

    let postContent: string = '';
    let mediaType: string = ''; // e.g., 'image', 'video', 'text'
    let mediaUrl: string = '';
    let privacy: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME' = 'PUBLIC';
    let submitting: boolean = false;
    let error: string | null = null;

    async function handleSubmit() {
        if (!postContent.trim()) {
            error = 'Post content cannot be empty.';
            return;
        }

        submitting = true;
        error = null;

        try {
            const newPost = await apiRequest('POST', '/feed/posts', {
                content: postContent.trim(),
                media_type: mediaType || undefined,
                media_url: mediaUrl || undefined,
                privacy: privacy,
            });
            postContent = ''; // Clear input
            mediaType = '';
            mediaUrl = '';
            privacy = 'PUBLIC';
            dispatch('postCreated', newPost);
        } catch (err: any) {
            error = err.message || 'Failed to create post.';
            console.error('Create post error:', err);
        } finally {
            submitting = false;
        }
    }
</script>

<Card class="w-full max-w-2xl mx-auto">
    <CardHeader>
        <h2 class="text-xl font-semibold">Create New Post</h2>
    </CardHeader>
    <CardContent class="space-y-4">
        <Textarea
            placeholder="What's on your mind?"
            bind:value={postContent}
            rows={4}
            class="w-full"
            disabled={submitting}
        />
        <!-- Optional: Media Upload/URL Input -->
        <!-- <div class="grid w-full items-center gap-1.5">
            <Label for="media-url">Media URL (Optional)</Label>
            <Input id="media-url" type="url" placeholder="e.g., https://example.com/image.jpg" bind:value={mediaUrl} disabled={submitting} />
        </div> -->
        <div class="grid w-full items-center gap-1.5">
            <CustomSelect
                bind:value={privacy}
                options={[
                    { value: 'PUBLIC', label: 'Public' },
                    { value: 'FRIENDS', label: 'Friends' },
                    { value: 'ONLY_ME', label: 'Only Me' },
                ]}
                placeholder="Select privacy"
                label="Privacy"
                disabled={submitting}
                style="w-[180px]"
            />
        </div>
        {#if error}
            <p class="text-red-500 text-sm">{error}</p>
        {/if}
    </CardContent>
    <CardFooter class="flex justify-end">
        <Button onclick={handleSubmit} disabled={submitting || !postContent.trim()}>
            {submitting ? 'Posting...' : 'Post'}
        </Button>
    </CardFooter>
</Card>