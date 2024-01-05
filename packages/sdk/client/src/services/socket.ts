//
// Copyright 2023 DXOS.org
//

import { type ClientServices, type ClientServicesProvider, clientServiceBundle } from '@dxos/client-protocol';
import type { WebsocketRpcClient } from '@dxos/websocket-rpc';

/**
 * Access to remote client via a socket.
 */
export const fromSocket = async (url: string): Promise<ClientServicesProvider> => {
  let dxRpcClient!: WebsocketRpcClient<ClientServices, {}>;

  return {
    get descriptors() {
      return clientServiceBundle;
    },

    get services() {
      return dxRpcClient.rpc;
    },

    open: async () => {
      const { WebsocketRpcClient } = await import('@dxos/websocket-rpc');
      dxRpcClient = new WebsocketRpcClient({
        url,
        requested: clientServiceBundle,
        exposed: {},
        handlers: {},
      });
      await dxRpcClient.open();
    },

    close: () => dxRpcClient.close(),
  };
};
