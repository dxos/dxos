//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { RpcPort } from '@dxos/rpc';

import { MessageData } from '../message';

const log = debug('dxos:rpc-tunnel:worker-port');

const createPort = (outgoing: string, incoming: string) => (messagePort: MessagePort): RpcPort => ({
  send: async message => {
    // Based on https://stackoverflow.com/a/54646864/2804332.
    const payload = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);
    messagePort.postMessage(
      {
        source: outgoing,
        payload
      },
      [payload]
    );
  },
  subscribe: callback => {
    console.log('subscribe', { outgoing, incoming });
    const handler = (event: MessageEvent<MessageData>) => {
      const message = event.data;
      if (message.source !== incoming) {
        return;
      }

      log(`Recieved message from ${incoming}:`, message);
      callback(new Uint8Array(message.payload));
    };

    messagePort.onmessage = handler;
    return () => {
      messagePort.onmessage = null;
    };
  }
});

/**
 * Create a RPC port into a worker.
 * @param messagePort Message port open to the worker.
 * @returns RPC port for messaging.
 */
export const createWorkerParentPort = createPort('parent', 'child');

/**
 * Create a RPC port from a worker to its parent.
 * @param messagePort Message port open to the parent.
 * @returns RPC port for messaging.
 */
export const createWorkerPort = createPort('child', 'parent');
