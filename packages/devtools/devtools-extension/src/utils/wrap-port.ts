//
// Copyright 2021 DXOS.org
//

import { Runtime } from 'webextension-polyfill';

import type { RpcPort } from '@dxos/rpc';

/**
 * Wrap a webextension port to make it compatible with DXOS RPC.
 */
// TODO(wittjosiah): Factor out to common extension utils?
export const wrapPort = (port: Runtime.Port): RpcPort => ({
  send: async message => port.postMessage(Array.from(message)),
  subscribe: callback => {
    const handler = (message: any) => {
      callback(new Uint8Array(message.data));
    };

    port.onMessage.addListener(handler);
    return () => port.onMessage.removeListener(handler);
  }
});
