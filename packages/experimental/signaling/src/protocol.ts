//
// Copyright 2024 DXOS.org
//

import type WebSocket from 'ws';

import { log } from '@dxos/log';

export const STUN_ENDPOINT = 'stun:stun.cloudflare.com:3478';

export const DATA_CHANNEL_LABEL = 'data-channel';
export const DATA_CHANNEL_ID = 0;

// TODO(burdon): Compare with current mesh signaling protocol.
// TODO(burdon): Bind message.type to data type. Discriminated union?
// TODO(burdon): Generalize?
export type SignalMessage<T = {}> = {
  type: 'ping' | 'pong' | 'join' | 'leave' | 'update' | 'rtc';
  data?: T;
};

/**
 * Devices (peers) connect to a connection object.
 */
export type Peer = {
  discoveryKey: string;
  peerKey: string;
};

export type SwarmPayload = {
  swarmKey?: string;
  peers?: Peer[];
};

export type WebRTCPayload = {
  from: Peer;
  to: Peer;
  description?: RTCSessionDescription;
  candidate?: RTCIceCandidate;
};

// TODO(burdon): Protobuf. CF uses Cap'n Proto.

export const encodeMessage = <T = {}>(message: SignalMessage<T>) => JSON.stringify(message);

export const decodeMessage = <T = {}>(data: WebSocket.Data): SignalMessage<T> | null => {
  try {
    return JSON.parse(data.toString()) as SignalMessage<T>;
  } catch (err) {
    log.catch(err);
    return null;
  }
};
