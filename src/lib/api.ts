import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { auth } from './stores/auth.svelte';

const API_BASE_URL = 'http://localhost:8080/api'; // Backend API URL

// Define Notification type based on backend model
export interface Notification {
	id: string;
	recipient_id: string;
	sender_id: string;
	type: string; // e.g., "MENTION", "LIKE"
	target_id: string;
	target_type: string; // e.g., "post", "comment"
	content: string;
	data?: Record<string, any>; // Structured data for the notification
	read: boolean;
	created_at: string; // ISO 8601 string
	user_id?: string; // Optional, for events related to user actions
}

export interface NotificationListResponse {
	notifications: Notification[];
	total: number;
	page: number;
	limit: number;
}

// Generic API request function with authentication and token refresh
export async function apiRequest(
	method: string,
	path: string,
	data?: any,
	requiresAuth: boolean = true
): Promise<any> {
	const headers: HeadersInit = {
		'Content-Type': 'application/json'
	};

	if (requiresAuth && auth.state.accessToken) {
		headers['Authorization'] = `Bearer ${auth.state.accessToken}`;
	}

	const config: RequestInit = {
		method: method,
		headers: headers,
		body: data ? JSON.stringify(data) : undefined
	};

	try {
		let response = await fetch(`${API_BASE_URL}${path}`, config);

		// If unauthorized and requires auth, try to refresh token
		if (response.status === 401 && requiresAuth) {
			const refreshed = await auth.refresh();
			if (refreshed) {
				// Retry original request with new token
				if (auth.state.accessToken) {
					headers['Authorization'] = `Bearer ${auth.state.accessToken}`;
					config.headers = headers;
				}
				response = await fetch(`${API_BASE_URL}${path}`, config);
			} else {
				// If refresh failed, redirect to login
				if (browser) {
					goto('/');
				}
				throw new Error('Authentication expired. Please log in again.');
			}
		}

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Something went wrong');
		}

		// For requests that don't return a body (e.g., 204 No Content)
		if (response.status === 204) {
			return;
		}

		return await response.json();
	} catch (error) {
		console.error('API Request Error:', error);
		throw error;
	}
}

// Notification API functions (they now use the new apiRequest)
export async function fetchNotifications(
	page: number = 1,
	limit: number = 10,
	readStatus?: boolean
): Promise<NotificationListResponse> {
	let path = `/notifications?page=${page}&limit=${limit}`;
	if (readStatus !== undefined) {
		path += `&read=${readStatus}`;
	}
	return apiRequest('GET', path, undefined, true);
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
	await apiRequest('PUT', `/notifications/${notificationId}/read`, undefined, true);
}

export async function getUnreadNotificationCount(): Promise<{ count: number }> {
	return apiRequest('GET', '/notifications/unread', undefined, true);
}

// We can add other non-auth API functions here as needed
