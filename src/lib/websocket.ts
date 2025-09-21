import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { addNotification } from './stores/notifications';
import type { Notification } from './api';

export interface WebSocketEvent {
	type: string;
	data: any; // Can be any payload
}

export const websocketMessages = writable<WebSocketEvent | null>(null);
let ws: WebSocket | null = null;
let reconnectInterval: number | null = null;

const WS_URL = 'ws://localhost:8081/ws';

export function connectWebSocket() {
	if (!browser) return;

	if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
		return;
	}

	const token = localStorage.getItem('accessToken');
	if (!token) {
		console.log('No access token found, WebSocket not connecting.');
		return;
	}

	console.log('Attempting to connect WebSocket...');
	const url = `${WS_URL}?token=${token}`;
	ws = new WebSocket(url);

	ws.onopen = () => {
		console.log('WebSocket connected.');
		if (reconnectInterval) {
			clearInterval(reconnectInterval);
			reconnectInterval = null;
		}
	};

	ws.onmessage = (event) => {
		try {
			const parsedEvent: WebSocketEvent = JSON.parse(event.data);
			console.log('WebSocket event received:', parsedEvent);

			switch (parsedEvent.type) {
				case 'NOTIFICATION_CREATED':
					addNotification(parsedEvent.data as Notification);
					break;
				// For other events, we update the generic store for other components to use
				default:
					websocketMessages.set(parsedEvent);
					break;
			}
		} catch (e) {
			console.error('Failed to parse WebSocket message:', e, event.data);
		}
	};

	ws.onclose = (event) => {
		console.log('WebSocket disconnected:', event.code, event.reason);
		if (!reconnectInterval) {
			reconnectInterval = window.setInterval(() => {
				connectWebSocket();
			}, 3000);
		}
	};

	ws.onerror = (error) => {
		console.error('WebSocket error:', error);
		ws?.close();
	};
}

export function disconnectWebSocket() {
    if (ws) {
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
        ws.close();
        ws = null;
        console.log('WebSocket disconnected manually.');
    }
}

export function sendWebSocketMessage(type: string, payload: any) {
	if (ws && ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({ type, payload }));
	} else {
		console.warn('WebSocket not open. Message not sent:', type, payload);
	}
}
