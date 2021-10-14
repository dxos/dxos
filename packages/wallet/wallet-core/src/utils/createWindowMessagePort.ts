//
// Copyright 2021 DXOS.org
//

import { RpcPort } from '@dxos/rpc';

export function createWindowMessagePort (): RpcPort {
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
