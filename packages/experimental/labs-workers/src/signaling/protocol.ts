//
// Copyright 2024 DXOS.org
//

import type WebSocket from 'ws';

import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

export type Message<T = {}> = {
  type: 'ping' | 'pong' | 'join' | 'leave' | 'info' | 'offer' | 'answer';
  sender?: PublicKey; // If undefined then from server.
  recipient?: PublicKey; // If undefined then broadcast.
  data?: T;
};

export type SwarmPayload = {
  peerKeys: PublicKey[];
};

export type WebRTCPayload = {
  description?: RTCSessionDescription;
  candidate?: RTCIceCandidate;
};

export const encodeMessage = <T = {}>(message: Message<T>) => JSON.stringify(message);

export const decodeMessage = <T = {}>(data: WebSocket.Data): Message<T> | null => {
  try {
    return JSON.parse(data.toString()) as Message<T>;
  } catch (err) {
    log.catch(err);
    return null;
  }
};
