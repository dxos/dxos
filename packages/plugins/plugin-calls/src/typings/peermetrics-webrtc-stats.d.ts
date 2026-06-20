//
// Copyright 2025 DXOS.org
//

declare module '@peermetrics/webrtc-stats' {
  import { EventEmitter } from 'events';

  export interface WebRTCStatsConstructorOptions {
    getStatsInterval?: number;
    rawStats?: boolean;
    statsObject?: boolean;
    filteredStats?: boolean;
    wrapGetUserMedia?: boolean;
    debug?: boolean;
    remote?: boolean;
    logLevel?: LogLevel;
  }

  export interface ConnectionInfo {
    pc: RTCPeerConnection;
    peerId: number | string;
    connectionId: string;
  }

  type TrackStats = {
    id: string;
    kind: 'audio' | 'video';
    codecId: string;
    mid: string;
    bytesSent: number;
    bytesReceived: number;
  };

  export type WebRTCStatsEvent = {
    data: {
      audio: { inbound: TrackStats[]; outbound: TrackStats[] };
      video: { inbound: TrackStats[]; outbound: TrackStats[] };
    };
  };

  export class WebRTCStats extends EventEmitter<{ stats: WebRTCStatsEvent }> {
    constructor(options: WebRTCStatsConstructorOptions);
    addConnection(info: ConnectionInfo): void;
    removeConnection(info: Pick<ConnectionInfo, 'pc'>): void;
  }
}
