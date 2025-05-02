//
// Copyright 2025 DXOS.org
//

import { EventEmitter } from 'events';

declare module '@peermetrics/webrtc-stats' {
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
    on(event: 'stats', listener: (stats: { data: Record<string, any> }) => void): this;
    removeListener(event: 'stats', listener: (stats: { data: Record<string, any> }) => void): this;
  }
}
