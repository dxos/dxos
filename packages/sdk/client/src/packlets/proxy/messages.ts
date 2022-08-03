//
// Copyright 2021 DXOS.org
//

import { RpcPort } from '@dxos/rpc';
import { isNode } from '@dxos/util';

export const createWindowMessagePort = (): RpcPort => {
  if (isNode()) {
    throw new Error('Connecting to wallet extension is not available in Node environment.');
  }

  return {
    send: async (message) => window.postMessage({
      payloadFromAppToContentScript: Array.from(message)
    }, '*'),

    subscribe: (callback) => {
      const listener: EventListener = (event) => {
        const payload = (event as any)?.data?.payloadFromContentScriptToApp;
        if (payload) {
          callback(new Uint8Array(payload));
        }
      };
      window.addEventListener('message', listener);
      return () => window.removeEventListener('message', listener);
    }
  };
};
