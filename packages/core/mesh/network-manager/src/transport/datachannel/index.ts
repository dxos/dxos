//
// Copyright 2023 DXOS.org
//

import node from 'node-datachannel';
import { IceCandidate } from './rtc-ice-candidate';
import { PeerConnection } from './rtc-peer-connection';
import { SessionDescription } from './rtc-session-description';

export { SessionDescription as RTCSessionDescription };
export { IceCandidate as RTCIceCandidate };
export { PeerConnection as RTCPeerConnection };

export function cleanup(): void {
  node.cleanup();
}
