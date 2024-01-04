//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { type ClientServices, type ClientServicesProvider, clientServiceBundle } from '@dxos/client-protocol';
import type { WebsocketRpcClient } from '@dxos/websocket-rpc';

/**
 * Access to remote client via a socket.
 */
export const fromSocket = async (url: string): Promise<ClientServicesProvider> => {
  // TODO(wittjosiah): Fire an event if the socket disconnects.
  const closed = new Event<Error | undefined>();
  let dxRpcClient!: WebsocketRpcClient<ClientServices, {}>;

  return {
    get closed() {
      return closed;
    },

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
