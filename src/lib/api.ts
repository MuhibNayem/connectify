import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const API_BASE_URL = 'http://localhost:8080/api'; // Backend API URL

// Svelte stores for authentication state
export const accessToken = writable<string | null>(null);
export const refreshToken = writable<string | null>(null);
export const isAuthenticated = writable<boolean>(false);
export const currentUser = writable<any | null>(null); // Store user data

// Initialize auth state from localStorage if available
if (browser) {
    (async () => { // Wrap in an async IIFE
        const storedAccessToken = localStorage.getItem('accessToken');
        const storedRefreshToken = localStorage.getItem('refreshToken');
        const storedCurrentUser = localStorage.getItem('currentUser'); // Retrieve stored user
        if (storedAccessToken && storedRefreshToken) {
            accessToken.set(storedAccessToken);
            refreshToken.set(storedRefreshToken);
            isAuthenticated.set(true);

            if (storedCurrentUser) {
                try {
                    currentUser.set(JSON.parse(storedCurrentUser)); // Set user from localStorage
                } catch (e) {
                    console.error('Failed to parse stored user data:', e);
                    localStorage.removeItem('currentUser'); // Clear invalid data
                }
            }

            // Always fetch user data to ensure it's fresh
            try {
                await getCurrentUser();
            } catch (error) {
                console.error('Failed to re-fetch user on app load:', error);
                clearAuth(); // Clear auth if user data cannot be fetched
            }
        }
    })();
}

// Function to update auth stores and localStorage
function setAuthTokens(access: string, refresh: string, user: any) {
    accessToken.set(access);
    refreshToken.set(refresh);
    isAuthenticated.set(true);
    currentUser.set(user);
    if (browser) {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        localStorage.setItem('currentUser', JSON.stringify(user));
    }
}

// Function to clear auth stores and localStorage
export function clearAuth() {
    accessToken.set(null);
    refreshToken.set(null);
    isAuthenticated.set(false);
    currentUser.set(null);
    if (browser) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }
}

// Generic API request function with authentication and token refresh
export async function apiRequest(
    method: string,
    path: string,
    data?: any,
    requiresAuth: boolean = true
): Promise<any> {
    let headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    let currentAccessToken: string | null = null;
    accessToken.subscribe(value => { currentAccessToken = value; })(); // Get current value from store

    if (requiresAuth && currentAccessToken) {
        headers['Authorization'] = `Bearer ${currentAccessToken}`;
    }

    const config: RequestInit = {
        method: method,
        headers: headers,
        body: data ? JSON.stringify(data) : undefined,
    };

    try {
        let response = await fetch(`${API_BASE_URL}${path}`, config);

        // If unauthorized and requires auth, try to refresh token
        if (response.status === 401 && requiresAuth) {
            const refreshed = await refreshAuthToken();
            if (refreshed) {
                // Retry original request with new token
                accessToken.subscribe(value => { currentAccessToken = value; })();
                if (currentAccessToken) {
                    headers['Authorization'] = `Bearer ${currentAccessToken}`;
                    config.headers = headers;
                }
                response = await fetch(`${API_BASE_URL}${path}`, config);
            } else {
                // If refresh failed, clear auth and redirect to login
                clearAuth();
                // You might want to add a goto('/') here in a real app
                throw new Error('Authentication expired. Please log in again.');
            }
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Something went wrong');
        }

        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Specific authentication functions
export async function login(credentials: any) {
    const response = await apiRequest('POST', '/auth/login', credentials, false); // Login doesn't require auth
    setAuthTokens(response.access_token, response.refresh_token, response.user);
    return response;
}

export async function register(userData: any) {
    const response = await apiRequest('POST', '/auth/register', userData, false); // Register doesn't require auth
    setAuthTokens(response.access_token, response.refresh_token, response.user);
    return response;
}

export async function logout() {
    try {
        await apiRequest('POST', '/auth/logout', {}, true); // Logout requires auth
    } finally {
        clearAuth(); // Always clear auth state on logout attempt
    }
}

async function refreshAuthToken(): Promise<boolean> {
    let currentRefreshToken: string | null = null;
    refreshToken.subscribe(value => { currentRefreshToken = value; })();

    if (!currentRefreshToken) {
        return false;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: currentRefreshToken }),
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        setAuthTokens(data.access_token, data.refresh_token, data.user);
        return true;
    } catch (error) {
        console.error('Token refresh failed:', error);
        clearAuth();
        return false;
    }
}

// Example of fetching current user (for protected routes)
export async function getCurrentUser() {
    try {
        const user = await apiRequest('GET', '/users/me', undefined, true);
        currentUser.set(user);
        return user;
    } catch (error) {
        console.error('Failed to fetch current user:', error);
        clearAuth(); // If fetching user fails, assume auth is bad
        throw error;
    }
}
