<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    // Assuming icons like ThumbsUp, MessageCircle, Share2 from Lucide Svelte
    // import { ThumbsUp, MessageCircle, Share2 } from 'lucide-svelte';

    import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar'; // Import Avatar components

    export let post: {
        id: string; // primitive.ObjectID will be string in frontend
        user_id: string; // Original user ID
        author: {
            id: string;
            username: string;
            avatar?: string;
            full_name?: string;
        };
        content: string;
        media_type?: string;
        media_url?: string;
        privacy: string;
        comments: any[]; // Assuming comments array
        mentions: string[];
        reaction_counts: { [key: string]: number }; // Map of reaction type to count
        hashtags: string[];
        created_at: string; // ISO string
        updated_at: string;
    };

    function handleLike() {
        alert(`Liked post by ${post?.author?.username}`);
        // In a real app, send like to backend
    }

    function handleComment() {
        alert(`Commenting on post by ${post?.author?.username}`);
        // In a real app, navigate to post details or open comment modal
    }

    function handleShare() {
        alert(`Sharing post by ${post?.author?.username}`);
        // In a real app, open share options
    }
</script>

<div class="bg-white p-4 rounded-lg shadow-md space-y-3">
    <!-- Post Header -->
    <div class="flex items-center space-x-3">
        <Avatar class="h-10 w-10">
            <AvatarImage src={post.author.avatar || 'https://github.com/shadcn.png'} alt={post?.author?.username} />
            <AvatarFallback>{post.author?.username?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
            <p class="font-semibold text-gray-900">{post.author.full_name || post.author.username}</p>
            <p class="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</p>
        </div>
    </div>

    <!-- Post Content -->
    <p class="text-gray-800 leading-relaxed">{post.content}</p>

    <!-- Post Actions (Likes, Comments Count) -->
    <div class="flex justify-between items-center text-sm text-gray-600 border-b border-gray-200 pb-2">
        <span>{post?.reaction_counts ? post?.reaction_counts['LIKE'] : 0} Likes</span>
        <span>{post?.comments?.length} Comments</span>
    </div>

    <!-- Action Buttons (Like, Comment, Share) -->
    <div class="flex justify-around pt-2">
        <Button variant="ghost" class="flex items-center space-x-1 text-gray-600 hover:text-indigo-600" onclick={handleLike}>
            <!-- <ThumbsUp size={20} /> -->
            <span class="text-xl">👍</span>
            <span>Like</span>
        </Button>
        <Button variant="ghost" class="flex items-center space-x-1 text-gray-600 hover:text-indigo-600" onclick={handleComment}>
            <!-- <MessageCircle size={20} /> -->
            <span class="text-xl">💬</span>
            <span>Comment</span>
        </Button>
        <Button variant="ghost" class="flex items-center space-x-1 text-gray-600 hover:text-indigo-600" onclick={handleShare}>
            <!-- <Share2 size={20} /> -->
            <span class="text-xl">🔗</span>
            <span>Share</span>
        </Button>
    </div>
</div>
