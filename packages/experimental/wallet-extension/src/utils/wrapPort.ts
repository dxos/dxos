//
// Copyright 2021 DXOS.org
//

import { Runtime } from 'webextension-polyfill';

import { RpcPort } from '@dxos/rpc';

export const wrapPort = (port: Runtime.Port): RpcPort => ({
  send: async (msg) => port.postMessage(Array.from(msg)),
  subscribe: (cb) => {
    const handler = (msg: any) => {
      cb(new Uint8Array(msg));
    };

    port.onMessage.addListener(handler);
    return () => port.onMessage.removeListener(handler);
  }
});
