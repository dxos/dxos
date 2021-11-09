//
// Copyright 2021 DXOS.org
//

import { RpcPort } from '@dxos/rpc';

import { isNode } from '../platform';

export const createWindowMessagePort = (): RpcPort => {
  if (isNode()) {
    throw new Error('Connecting to wallet extension is not available in Node environment.');
  }

  return {
    send: async (msg) => window.postMessage({ payloadFromAppToContentScript: Array.from(msg) }, '*'),
    subscribe: (cb) => {
      const listener: EventListener = (ev) => {
        const payload = (ev as any)?.data?.payloadFromContentScriptToApp;
        if (payload) {
          cb(payload);
        }
      };
      window.addEventListener('message', listener);
      return () => window.removeEventListener('message', listener);
    }
  };
}
