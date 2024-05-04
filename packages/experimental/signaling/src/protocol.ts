//
// Copyright 2024 DXOS.org
//

import type WebSocket from 'ws';

import { log } from '@dxos/log';

// TODO(burdon): Compare with current mesh signaling protocol.
// TODO(burdon): Bind message.type to data type. Discriminated union?

export type Message<T = {}> = {
  type: 'ping' | 'pong' | 'join' | 'leave' | 'update' | 'rtc-offer' | 'rtc-answer';
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
  swarmKey: string;
  peerKey: string;
  description?: RTCSessionDescription;
  candidate?: RTCIceCandidate;
};

// TODO(burdon): Protobuf. CF uses Cap'n Proto.

export const encodeMessage = <T = {}>(message: Message<T>) => JSON.stringify(message);

export const decodeMessage = <T = {}>(data: WebSocket.Data): Message<T> | null => {
  try {
    return JSON.parse(data.toString()) as Message<T>;
  } catch (err) {
    log.catch(err);
    return null;
  }
};
