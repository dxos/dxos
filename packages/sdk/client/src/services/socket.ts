//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { type ClientServices, type ClientServicesProvider, clientServiceBundle } from '@dxos/client-protocol';
import { log } from '@dxos/log';
import { ApiError } from '@dxos/protocols';
import type { WebsocketRpcClient } from '@dxos/websocket-rpc';

/**
 * Access to remote client via a socket.
 */
export const fromSocket = async (url: string, authenticationToken?: string): Promise<ClientServicesProvider> => {
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
        authenticationToken,
        requested: clientServiceBundle,
        exposed: {},
        handlers: {},
      });

      dxRpcClient.error.on(async (error) => {
        log.warn('websocket rpc client error', { error });
        // Browsers do not include the error message in the event object, so we cannot discern 401 errors from other errors.
        if (error.message.includes('401')) {
          log.warn('websocket authentication failed');
        }
        closed.emit(new ApiError('websocket error'));
      });
      await dxRpcClient.open();
    },

    close: async () => {
      await dxRpcClient.close();
    },
  };
};
