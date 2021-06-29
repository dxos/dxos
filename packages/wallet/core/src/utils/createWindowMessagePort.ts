//
// Copyright 2021 DXOS.org
//

import { RpcPort } from '@dxos/rpc';

export function createWindowMessagePort (): RpcPort {
  return {
    send: async (msg) => window.postMessage({ 'payloadFromAppToContentScript': Array.from(msg) }, '*'),
    subscribe: (cb) => {
      const listener: EventListener = (ev) => {
        const ourPayload = (ev as any)?.data?.payloadFromContentScriptToApp
        if (ourPayload) {
          console.log('got our payload: ', ourPayload)
          cb(ourPayload)
        }
      }
      window.addEventListener('message', listener)
      return () => window.removeEventListener('message', listener)
    }
  };
}
