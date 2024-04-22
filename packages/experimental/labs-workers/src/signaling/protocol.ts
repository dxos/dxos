//
// Copyright 2024 DXOS.org
//

import type WebSocket from 'ws';

import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

// TODO(burdon): Use PublicKey and encode/decode. Protobuf.
export type SwarmMessage<T = {}> = {
  swarmKey?: PublicKey;
  peerKey?: PublicKey;
  data?: T;
};

export const encodeMessage = (message: SwarmMessage) => JSON.stringify(message);

export const decodeMessage = (data: WebSocket.Data): SwarmMessage | null => {
  try {
    return JSON.parse(data.toString()) as SwarmMessage;
  } catch (err) {
    log.catch(err);
    return null;
  }
};
