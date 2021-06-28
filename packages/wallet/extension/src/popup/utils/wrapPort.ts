//
// Copyright 2021 DXOS.org
//

import { RpcPort } from '@dxos/rpc';
import { Runtime } from 'webextension-polyfill-ts';

export function wrapPort (port: Runtime.Port): RpcPort {
  return {
    send: async (msg) => port.postMessage(Array.from(msg)),
    subscribe: cb => {
      const handler = (msg: any) => {
        cb(new Uint8Array(msg));
      };

      port.onMessage.addListener(handler);
      return () => port.onMessage.removeListener(handler);
    }
  };
}