//
// Copyright 2025 DXOS.org
//

declare module '@peermetrics/webrtc-stats' {
  import { EventEmitter } from 'events';

  export interface WebRTCStatsOptions {
    getStatsInterval: number;
  }

  export interface ConnectionInfo {
    pc: RTCPeerConnection;
    peerId: number | string;
    connectionId: string;
  }

  export class WebRTCStats extends EventEmitter {
    constructor(options: WebRTCStatsOptions);
    addConnection(info: ConnectionInfo): void;
    removeConnection(info: Pick<ConnectionInfo, 'pc'>): void;
  }
}
