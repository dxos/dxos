//
// Copyright 2021 DXOS.org
//

import Bridge from 'crx-bridge';

import type { RpcPort } from '@dxos/rpc';

const MESSAGE_ID = 'devtools';

const createPort = (destination: string): RpcPort => {
  return {
    send: async (msg) => {
      console.log('[DXOS devtools] send', { now: new Date().toISOString(), destination, msg });
      await Bridge.sendMessage(MESSAGE_ID, Array.from(msg), destination);
    },
    subscribe: callback => {
      console.log('[DXOS devtools] subscribe', { now: new Date().toISOString(), destination });
      Bridge.onMessage(MESSAGE_ID, (message) => {
        callback(new Uint8Array(message.data));
      });
    }
  };
};

/**
 * Port that can be used by window to send messages to devtools.
 */
export const createWindowPort = () => createPort('devtools');

/**
 * Port that can be used by devtools to send messages to window.
 */
export const createDevtoolsPort = () => createPort('window');
