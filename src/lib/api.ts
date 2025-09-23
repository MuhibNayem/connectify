import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { auth } from './stores/auth.svelte';

const API_BASE_URL = 'http://localhost:8080/api'; // Backend API URL

// --- Backend Model Interfaces ---

export interface MessageReaction {
	user_id: string;
	emoji: string;
	timestamp: string;
}

export interface Message {
	id: string;
	sender_id: string;
	sender_name?: string;
	receiver_id?: string;
	group_id?: string;
	group_name?: string;
	content?: string;
	content_type: string;
	media_urls?: string[];
	seen_by: string[];
	delivered_to?: string[];
	is_deleted: boolean;
	deleted_at?: string;
	is_edited: boolean;
	edited_at?: string;
	reactions?: MessageReaction[];
	reply_to_message_id?: string;
	created_at: string;
	updated_at?: string;
}

export interface MessageRequest {
	receiver_id?: string;
	sender_id?: string; // Will be set by backend from auth
	group_id?: string;
	content?: string;
	content_type: string;
	media_urls?: string[];
	reply_to_message_id?: string;
}

export interface MessageResponse {
	messages: Message[];
	total: number;
	page: number;
	limit: number;
	has_more: boolean;
}

export interface ConversationSummary {
	id: string;
	name: string;
	avatar?: string;
	is_group: boolean;
	last_message_content?: string;
	last_message_timestamp?: string;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface Friendship {
	id: string;
	requester_id: string;
	receiver_id: string;
	status: FriendshipStatus;
	created_at: string;
	updated_at: string;
}

export interface UserShortResponse {
	id: string;
	username: string;
	email: string;
	avatar?: string;
	full_name?: string;
}

export interface PopulatedFriendship {
	id: string;
	requester_id: string;
	receiver_id: string;
	requester_info: UserShortResponse;
	receiver_info: UserShortResponse;
	status: FriendshipStatus;
	created_at: string;
	updated_at: string;
}

export interface FriendshipStatusResponse {
	are_friends: boolean;
	request_sent: boolean;
	request_received: boolean;
	is_blocked_by_viewer: boolean;
	has_blocked_viewer: boolean;
}

export interface GroupResponse {
	id: string;
	name: string;
	creator: UserShortResponse;
	members: UserShortResponse[];
	admins: UserShortResponse[];
	created_at: string;
	updated_at: string;
}

export interface CreateGroupRequest {
	name: string;
	member_ids: string[];
}

export interface AddMemberRequest {
	user_id: string;
}

export interface UpdateGroupRequest {
	name?: string;
}

export interface SuccessResponse {
	success: boolean;
}

export interface ErrorResponse {
	error: string;
}

export interface UnreadCountResponse {
	count: number;
}

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


// Chat-related API functions

export async function getFriendships(status?: FriendshipStatus, page: number = 1, limit: number = 10): Promise<{ data: PopulatedFriendship[]; total: number; page: number; totalPages: number }> {
	let path = `/friendships?page=${page}&limit=${limit}`;
	if (status) {
		path += `&status=${status}`;
	}
	return apiRequest('GET', path, undefined, true);
}

export async function sendFriendRequest(receiverId: string): Promise<Friendship> {
	return apiRequest('POST', '/friendships/requests', { receiver_id: receiverId }, true);
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean): Promise<SuccessResponse> {
	return apiRequest('POST', `/friendships/requests/respond/${friendshipId}`, { accept }, true);
}

export async function checkFriendshipStatus(otherUserId: string): Promise<FriendshipStatusResponse> {
	return apiRequest('GET', `/friendships/check?other_user_id=${otherUserId}`, undefined, true);
}

export async function unfriendUser(friendId: string): Promise<SuccessResponse> {
	return apiRequest('DELETE', `/friendships/${friendId}`, undefined, true);
}

export async function blockUser(userId: string): Promise<SuccessResponse> {
	return apiRequest('POST', `/friendships/block/${userId}`, undefined, true);
}

export async function unblockUser(userId: string): Promise<SuccessResponse> {
	return apiRequest('DELETE', `/friendships/block/${userId}`, undefined, true);
}

export async function isUserBlocked(userId: string): Promise<{ is_blocked: boolean }> {
	return apiRequest('GET', `/friendships/block/${userId}/status`, undefined, true);
}

export async function getBlockedUsers(): Promise<{ blocked_users: UserShortResponse[] }> {
	return apiRequest('GET', '/friendships/blocked', undefined, true);
}

export async function getUserGroups(): Promise<GroupResponse[]> {
	return apiRequest('GET', '/groups', undefined, true);
}

export async function getMessages(params: { receiverID?: string; groupID?: string; page?: number; limit?: number; before?: string }): Promise<MessageResponse> {
	const query = new URLSearchParams();
	if (params.receiverID) query.set('receiverID', params.receiverID);
	if (params.groupID) query.set('groupID', params.groupID);
	if (params.page) query.set('page', String(params.page));
	if (params.limit) query.set('limit', String(params.limit));
	if (params.before) query.set('before', params.before);

	return apiRequest('GET', `/messages?${query.toString()}`, undefined, true);
}

export async function sendMessage(payload: MessageRequest): Promise<Message> {
	return apiRequest('POST', '/messages', payload, true);
}

	export async function markMessagesAsSeen(messageIds: string[]): Promise<void> {
		await apiRequest('POST', '/messages/seen', messageIds, true);
	}

	export async function markMessagesAsDelivered(messageIds: string[]): Promise<void> {
		await apiRequest('POST', '/messages/delivered', messageIds, true);
	}

	export async function getUnreadMessageCount(): Promise<UnreadCountResponse> {	return apiRequest('GET', '/messages/unread', undefined, true);
}

export async function deleteMessage(messageId: string): Promise<SuccessResponse> {
	return apiRequest('DELETE', `/messages/${messageId}`, undefined, true);
}

export async function editMessage(messageId: string, content: string): Promise<Message> {
	return apiRequest('PUT', `/messages/${messageId}`, { content }, true);
}

export async function searchMessages(query: string, page: number = 1, limit: number = 20): Promise<Message[]> {
	const params = new URLSearchParams();
	params.set('q', query);
	params.set('page', String(page));
	params.set('limit', String(limit));
	return apiRequest('GET', `/messages/search?${params.toString()}`, undefined, true);
}

export async function addMessageReaction(messageId: string, emoji: string): Promise<SuccessResponse> {
	return apiRequest('POST', `/messages/${messageId}/react`, { emoji }, true);
}

export async function removeMessageReaction(messageId: string, emoji: string): Promise<SuccessResponse> {
	return apiRequest('DELETE', `/messages/${messageId}/react`, { emoji }, true);
}

export async function getConversationSummaries(): Promise<ConversationSummary[]> {
	return apiRequest('GET', '/conversations', undefined, true);
}

export async function markConversationAsSeen(conversationId: string, timestamp: string, isGroup: boolean): Promise<void> {
	const [type, id] = conversationId.split('-');
	await apiRequest('POST', `/conversations/${id}/seen`, { timestamp, is_group: isGroup }, true);
}

export async function createGroup(payload: CreateGroupRequest): Promise<GroupResponse> {
	return apiRequest('POST', '/groups', payload, true);
}

export async function getGroupDetails(groupId: string): Promise<GroupResponse> {
	return apiRequest('GET', `/groups/${groupId}`, undefined, true);
}

export async function addMemberToGroup(groupId: string, userId: string): Promise<void> {
	return apiRequest('POST', `/groups/${groupId}/members`, { user_id: userId }, true);
}

export async function addAdminToGroup(groupId: string, userId: string): Promise<void> {
	return apiRequest('POST', `/groups/${groupId}/admins`, { user_id: userId }, true);
}

export async function removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
	return apiRequest('DELETE', `/groups/${groupId}/members/${userId}`, undefined, true);
}

export async function updateGroup(groupId: string, payload: UpdateGroupRequest): Promise<GroupResponse> {
	return apiRequest('PUT', `/groups/${groupId}`, payload, true);
}

// Keep existing functions that are not directly covered by the new API spec or are client-specific
export async function register(userData: any): Promise<any> {
    return apiRequest('POST', '/auth/register', userData, false);
}


