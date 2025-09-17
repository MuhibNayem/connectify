<script lang="ts">
    import AuthLayout from '$lib/components/auth/AuthLayout.svelte';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { goto } from '$app/navigation';
    import { register } from '$lib/api'; // Import register function

    let username = '';
    let email = '';
    let password = '';
    let confirmPassword = '';
    let errorMessage: string | null = null; // For displaying API errors

    async function handleRegister() {
        errorMessage = null; // Clear previous errors
        if (password !== confirmPassword) {
            errorMessage = 'Passwords do not match!';
            return;
        }
        try {
            const response = await register({ username, email, password });
            console.log('Registration successful:', response);
            alert('Registration successful! You are now logged in.');
            goto('/dashboard'); // Redirect to dashboard on success
        } catch (error: any) {
            console.error('Registration failed:', error.message);
            errorMessage = error.message || 'Registration failed. Please try again.';
        }
    }
</script>

<AuthLayout title="Join Connectify" description="Create your new account">
    <form on:submit|preventDefault={handleRegister} class="space-y-6">
        {#if errorMessage}
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span class="block sm:inline">{errorMessage}</span>
            </div>
        {/if}
        <div>
            <Label for="username" class="text-sm font-medium text-gray-700">Username</Label>
            <Input
                id="username"
                type="text"
                placeholder="yourusername"
                bind:value={username}
                required
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
        </div>
        <div>
            <Label for="email" class="text-sm font-medium text-gray-700">Email</Label>
            <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                bind:value={email}
                required
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
        </div>
        <div>
            <Label for="password" class="text-sm font-medium text-gray-700">Password</Label>
            <Input
                id="password"
                type="password"
                placeholder="••••••••"
                bind:value={password}
                required
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
        </div>
        <div>
            <Label for="confirm-password" class="text-sm font-medium text-gray-700">Confirm Password</Label>
            <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                bind:value={confirmPassword}
                required
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
        </div>
        <Button type="submit" class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Register
        </Button>
    </form>

    <div slot="footer" class="text-center">
        <Button variant="link" href="/" class="text-sm text-gray-600 hover:text-gray-900 p-0 h-auto">
            Already have an account? Login
        </Button>
    </div>
</AuthLayout>
