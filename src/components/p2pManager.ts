/**
 * Motion P2P Connection Manager
 * 
 * Handles local WebRTC DataChannels for low-bandwidth session sync.
 * No central media servers required — transfers lightweight viseme & clarity payloads.
 */

export interface VisemePayload {
  type: 'viseme';
  visemeId: number;       // Standard viseme shape index (0-20)
  phoneme: string;        // Current phoneme string e.g. "/OH/"
  text: string;           // Transcribed phrase segment
  timestamp: number;
}

export interface ClarityPayload {
  type: 'clarity';
  pacingScore: number;    // Percentage (0 - 100)
  volumeLevel: number;    // Percentage (0 - 100)
  timestamp: number;
}

export type MotionP2PPayload = VisemePayload | ClarityPayload;

export class MotionP2PManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  
  private onMessageCallback?: (data: MotionP2PPayload) => void;
  private onStatusChangeCallback?: (connected: boolean) => void;

  // Standard WebRTC STUN servers for NAT traversal (No TURN / video overhead)
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  constructor(
    onMessage?: (data: MotionP2PPayload) => void,
    onStatusChange?: (connected: boolean) => void
  ) {
    this.onMessageCallback = onMessage;
    this.onStatusChangeCallback = onStatusChange;
  }

  /**
   * HOST FLOW: Initialize a new host session and generate an SDP offer.
   */
  public async createHostOffer(): Promise<string> {
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    // Host creates the DataChannel for low-latency message passing
    this.dataChannel = this.peerConnection.createDataChannel('motion-practice-channel', {
      ordered: true
    });

    this.setupDataChannelListeners(this.dataChannel);
    this.setupICEGathering();

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Base64 encode the SDP payload so it can be converted to a short QR code or string
    return btoa(JSON.stringify(this.peerConnection.localDescription));
  }

  /**
   * PEER FLOW: Receive host SDP offer, generate SDP answer.
   */
  public async handleHostOfferAndCreateAnswer(encodedOffer: string): Promise<string> {
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannelListeners(this.dataChannel);
    };

    this.setupICEGathering();

    const offerDesc = JSON.parse(atob(encodedOffer));
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerDesc));

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    return btoa(JSON.stringify(this.peerConnection.localDescription));
  }

  /**
   * HOST FLOW: Finalize connection by receiving the peer's SDP answer.
   */
  public async finalizeHostConnection(encodedAnswer: string): Promise<void> {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    
    const answerDesc = JSON.parse(atob(encodedAnswer));
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerDesc));
  }

  /**
   * Broadcast light payload (viseme shape or clarity score) to peer
   */
  public sendData(payload: MotionP2PPayload): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(payload));
    }
  }

  /**
   * Terminate session and purge channel memory immediately
   */
  public disconnectSession(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(false);
    }
  }

  private setupDataChannelListeners(channel: RTCDataChannel): void {
    channel.onopen = () => {
      if (this.onStatusChangeCallback) this.onStatusChangeCallback(true);
    };

    channel.onclose = () => {
      if (this.onStatusChangeCallback) this.onStatusChangeCallback(false);
    };

    channel.onmessage = (event) => {
      try {
        const parsedData: MotionP2PPayload = JSON.parse(event.data);
        if (this.onMessageCallback) {
          this.onMessageCallback(parsedData);
        }
      } catch (err) {
        console.error('Failed to parse incoming P2P payload:', err);
      }
    };
  }

  private setupICEGathering(): void {
    if (!this.peerConnection) return;
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        if (this.onStatusChangeCallback) this.onStatusChangeCallback(false);
      }
    };
  }
}