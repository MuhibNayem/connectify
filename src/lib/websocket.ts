import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface WebSocketEvent {
    Type: string;
    Data: any; // This will be the unmarshaled JSON data
}

const websocketMessages = writable<WebSocketEvent | null>(null);
let ws: WebSocket | null = null;
let reconnectInterval: number | null = null;

const WS_URL = 'ws://localhost:8081/ws'; // Adjust if your WebSocket server is on a different port/path

function connectWebSocket() {
    if (!browser) return; // Only connect in browser environment

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log('WebSocket already connected or connecting.');
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
        // Optionally send an auth token if needed by the backend
        // ws.send(JSON.stringify({ type: 'auth', token: localStorage.getItem('accessToken') }));
    };

    ws.onmessage = (event) => {
        try {
            const parsedData: WebSocketEvent = JSON.parse(event.data);
            // Data field might be a JSON string itself, so parse it again if needed
            if (typeof parsedData.Data === 'string') {
                parsedData.Data = JSON.parse(parsedData.Data);
            }
            websocketMessages.set(parsedData);
        } catch (e) {
            console.error('Failed to parse WebSocket message:', e, event.data);
        }
    };

    ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        // Attempt to reconnect after a delay
        if (!reconnectInterval) {
            reconnectInterval = window.setInterval(() => {
                connectWebSocket();
            }, 3000); // Try to reconnect every 3 seconds
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.log('WebSocket error:', error);
        ws?.close(); // Close to trigger onclose and reconnection logic
    };
}

// Automatically connect when this module is imported in the browser
if (browser) {
    connectWebSocket();
}

// Function to send messages through the WebSocket
function sendWebSocketMessage(type: string, payload: any) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, payload }));
    } else {
        console.warn('WebSocket not open. Message not sent:', type, payload);
    }
}

export { websocketMessages, sendWebSocketMessage };
