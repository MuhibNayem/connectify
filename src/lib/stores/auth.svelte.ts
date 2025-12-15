import { browser } from '$app/environment';
import { register as apiRegister } from '$lib/api'; // Renamed to avoid conflict

// Define the shape of the user and auth state
interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    // Add any other user properties you need
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Create the state with Svelte 5 Runes
const authState = $state<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
});

// Function to initialize state from localStorage
function initializeState() {
    if (!browser) return;

    const storedUser = localStorage.getItem('currentUser');
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedUser && storedAccessToken && storedRefreshToken) {
        try {
            authState.user = JSON.parse(storedUser);
            authState.accessToken = storedAccessToken;
            authState.refreshToken = storedRefreshToken;
        } catch (e) {
            console.error('Failed to parse stored auth state:', e);
            clearState(); // Clear corrupted data
        }
    }
}

// Function to persist state to localStorage
function persistState() {
    if (!browser) return;
    if (authState.user && authState.accessToken && authState.refreshToken) {
        localStorage.setItem('currentUser', JSON.stringify(authState.user));
        localStorage.setItem('accessToken', authState.accessToken);
        localStorage.setItem('refreshToken', authState.refreshToken);
    } else {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }
}

// Function to clear the auth state
function clearState() {
    authState.user = null;
    authState.accessToken = null;
    authState.refreshToken = null;
    persistState();
}

// Main exportable auth store object
export const auth = {
    // Expose state reactively
    get state() {
        return authState;
    },

    // Initialize the store
    initialize: initializeState,

    // Login method
    login: async (credentials: { email: string; password: string }) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Login failed');
        }

        const data = await response.json();
        authState.user = data.user;
        authState.accessToken = data.access_token;
        authState.refreshToken = data.refresh_token;
        persistState();
        return data;
    },

    // Register method
    register: async (userData: any) => {
        const data = await apiRegister(userData);
        authState.user = data.user;
        authState.accessToken = data.access_token;
        authState.refreshToken = data.refresh_token;
        persistState();
        return data;
    },

    // Logout method
    logout: async () => {
        if (authState.accessToken) {
            try {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${authState.accessToken}` },
                });
            } catch (error) {
                console.error('Logout API call failed, clearing state regardless.', error);
            }
        }
        clearState();
    },

    // Token refresh method
    refresh: async (): Promise<boolean> => {
        if (!authState.refreshToken) {
            clearState();
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: authState.refreshToken }),
            });

            if (!response.ok) {
                throw new Error('Failed to refresh token');
            }

            const data = await response.json();
            authState.user = data.user;
            authState.accessToken = data.access_token;
            authState.refreshToken = data.refresh_token;
            persistState();
            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            clearState();
            return false;
        }
    },

    // Update user method
    updateUser: (userData: Partial<User>) => {
        if (authState.user) {
            authState.user = { ...authState.user, ...userData };
            persistState();
        }
    }
};

// Initialize on module load
initializeState();
