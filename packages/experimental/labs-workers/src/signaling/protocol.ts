//
// Copyright 2024 DXOS.org
//

import type WebSocket from 'ws';

import { log } from '@dxos/log';

export type SwarmMessage = {
  swarmKey?: string;
  peerKey?: string;
  data?: any;
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
