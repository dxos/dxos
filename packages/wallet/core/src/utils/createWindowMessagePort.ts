//
// Copyright 2021 DXOS.org
//

import { RpcPort } from '@dxos/rpc';

export function createWindowMessagePort (): RpcPort {
  return {
    send: async (msg) => window.postMessage({ 'payload': Array.from(msg) }, '*'),
    subscribe: () => {
      return () => {};
    }
  };
}
