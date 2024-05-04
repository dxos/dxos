//
// Copyright 2024 DXOS.org
//

import type WebSocket from 'ws';

import { log } from '@dxos/log';

// TODO(burdon): Compare with current mesh signaling protocol.

export type Message<T = {}> = {
  type: 'ping' | 'pong' | 'join' | 'leave' | 'info' | 'offer' | 'answer';
  // recipients?: string[]; // If undefined then broadcast.
  data?: T;
};

// TODO(burdon): Bind message.type to data type. Discriminated union?
export type SwarmPayload = {
  swarmKey?: string;
  peerKeys?: string[];
};

export type WebRTCPayload = {
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
