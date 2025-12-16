import { writable, type Writable } from 'svelte/store';
import { sendWebSocketMessage } from '$lib/websocket';

export interface CallState {
    status: 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';
    callerId: string | null;
    targetId: string | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
}

export interface SignalingMessage {
    signal_type: 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE' | 'END_CALL' | 'REJECT_CALL' | 'BUSY';
    signal_data?: any;
    caller_id?: string;
}

class VoiceCallService {
    state: Writable<CallState>;
    peerConnection: RTCPeerConnection | null = null;
    pendingCandidates: RTCIceCandidate[] = [];

    constructor() {
        this.state = writable({
            status: 'idle',
            callerId: null,
            targetId: null,
            localStream: null,
            remoteStream: null
        });
    }

    async initializePeerConnection(targetId: string, isInitiator: boolean) {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                sendWebSocketMessage('call_signal', {
                    target_id: targetId,
                    signal_type: 'ICE_CANDIDATE',
                    signal_data: event.candidate
                });
            }
        };

        this.peerConnection.ontrack = (event) => {
            const currentState = this.getSnapshot();
            if (currentState.remoteStream !== event.streams[0]) {
                this.state.update(s => ({ ...s, remoteStream: event.streams[0] }));
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            if (this.peerConnection?.connectionState === 'disconnected' ||
                this.peerConnection?.connectionState === 'failed' ||
                this.peerConnection?.connectionState === 'closed') {
                this.cleanup(`Connection State: ${this.peerConnection?.connectionState}`);
            } else if (this.peerConnection?.connectionState === 'connected') {
                this.state.update(s => ({ ...s, status: 'connected' }));
            }
        };

        // Add local stream tracks
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this.state.update(s => ({ ...s, localStream: stream }));
            stream.getTracks().forEach(track => {
                this.peerConnection?.addTrack(track, stream);
            });
        } catch (error) {
            console.error('[VoiceCall] Error accessing media devices:', error);
            this.cleanup('Error accessing media');
            return;
        }
        // Removed automatic pendingCandidates processing from here
    }

    async startCall(targetId: string) {
        if (this.getSnapshot().status !== 'idle') return;

        this.state.update(s => ({ ...s, status: 'calling', targetId }));
        await this.initializePeerConnection(targetId, true);

        const offer = await this.peerConnection!.createOffer();
        await this.peerConnection!.setLocalDescription(offer);

        sendWebSocketMessage('call_signal', {
            target_id: targetId,
            signal_type: 'OFFER',
            signal_data: offer
        });
    }

    async handleIncomingSignal(message: SignalingMessage) {
        const { signal_type, signal_data, caller_id } = message;
        console.log('[VoiceCall] Incoming Signal:', signal_type, 'Caller:', caller_id);
        const current = this.getSnapshot();

        switch (signal_type) {
            case 'OFFER':
                console.log('[VoiceCall] Processing OFFER from:', caller_id);
                // Debug log for duplicate check
                console.log(`[VoiceCall] Check Duplicate: Status=${current.status}, CurCaller=${current.callerId}, NewCaller=${caller_id}`);

                if (current.status !== 'idle') {
                    // Check if it's the same caller (allow retries)
                    if (current.status === 'incoming' && current.callerId === caller_id) {
                        console.warn('[VoiceCall] Ignoring duplicate OFFER from same caller.');
                        return;
                    }
                    console.warn(`[VoiceCall] User is busy. Status: ${current.status}. Rejecting.`);
                    sendWebSocketMessage('call_signal', {
                        target_id: caller_id,
                        signal_type: 'BUSY'
                    });
                    return;
                }
                this.state.update(s => ({ ...s, status: 'incoming', callerId: caller_id!, targetId: caller_id! }));
                (this as any).pendingOffer = signal_data;
                break;

            case 'ANSWER':
                console.log('[VoiceCall] Processing ANSWER');
                if (current.status === 'calling' && this.peerConnection) {
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal_data));
                    this.state.update(s => ({ ...s, status: 'connected' }));
                } else {
                    console.warn('[VoiceCall] Received ANSWER but not calling or no peer connection.');
                }
                break;

            case 'ICE_CANDIDATE':
                console.log('[VoiceCall] Processing ICE CANDIDATE');
                // Only add candidate if remote description is set
                if (this.peerConnection && this.peerConnection.remoteDescription) {
                    try {
                        await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal_data));
                    } catch (e) {
                        console.error('[VoiceCall] Error adding ICE candidate:', e);
                    }
                } else {
                    console.log('[VoiceCall] Buffering ICE Candidate (Remote Description not ready)');
                    this.pendingCandidates.push(new RTCIceCandidate(signal_data));
                }
                break;

            case 'END_CALL':
            case 'REJECT_CALL':
            case 'BUSY':
                console.log(`[VoiceCall] Call Ended/Rejected/Busy: ${signal_type}`);
                this.cleanup(`Remote Signal: ${signal_type}`);
                break;
        }
    }

    async acceptCall() {
        console.log('[VoiceCall] Accepting Call...');
        const current = this.getSnapshot();
        const callerId = current.callerId;
        if (!callerId) {
            console.error('[VoiceCall] Accept failed: No caller ID');
            return;
        }

        try {
            // Initialize and set remote description (Offer)
            await this.initializePeerConnection(callerId, false);
            const offer = (this as any).pendingOffer;

            if (!offer) {
                console.error('[VoiceCall] Accept failed: No pending offer found');
                this.cleanup();
                return;
            }

            console.log('[VoiceCall] Setting Remote Description (Offer)');
            await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));

            // Process any pending ICE candidates now that we have a remote description
            if (this.pendingCandidates.length > 0) {
                console.log(`[VoiceCall] Processing ${this.pendingCandidates.length} buffered ICE candidates`);
                for (const candidate of this.pendingCandidates) {
                    try {
                        await this.peerConnection!.addIceCandidate(candidate);
                    } catch (e) {
                        console.error('[VoiceCall] Error adding buffered ICE candidate:', e);
                    }
                }
                this.pendingCandidates = [];
            }

            // Create Answer
            console.log('[VoiceCall] Creating Answer');
            const answer = await this.peerConnection!.createAnswer();
            await this.peerConnection!.setLocalDescription(answer);

            console.log('[VoiceCall] Sending Answer');
            sendWebSocketMessage('call_signal', {
                target_id: callerId,
                signal_type: 'ANSWER',
                signal_data: answer
            });

            this.state.update(s => ({ ...s, status: 'connected' }));
        } catch (e) {
            console.error('[VoiceCall] Error accepting call:', e);
            this.cleanup();
        }
    }

    rejectCall() {
        const current = this.getSnapshot();
        if (current.callerId) {
            sendWebSocketMessage('call_signal', {
                target_id: current.callerId,
                signal_type: 'REJECT_CALL'
            });
        }
        this.cleanup();
    }

    endCall() {
        const current = this.getSnapshot();
        const target = current.targetId || current.callerId;
        if (target) {
            sendWebSocketMessage('call_signal', {
                target_id: target,
                signal_type: 'END_CALL'
            });
        }
        this.cleanup();
    }

    cleanup(reason: string = 'Unknown') {
        if (this.getSnapshot().status === 'idle') return; // Prevent double cleanup logs

        console.log('[VoiceCall] Cleaning up... Reason:', reason);
        const current = this.getSnapshot();
        if (current.localStream) {
            current.localStream.getTracks().forEach(track => track.stop());
        }
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.pendingCandidates = [];
        (this as any).pendingOffer = null;

        this.state.set({
            status: 'idle',
            callerId: null,
            targetId: null,
            localStream: null,
            remoteStream: null
        });
    }

    // Helper to get current state value
    private getSnapshot(): CallState {
        let currentValue: CallState;
        this.state.subscribe(value => currentValue = value)();
        return currentValue!;
    }
}

export const voiceCallService = new VoiceCallService();
export const callState = voiceCallService.state;
