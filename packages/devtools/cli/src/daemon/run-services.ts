//
// Copyright 2023 DXOS.org
//

import { assert } from 'node:console';
import { mkdirSync, rmSync } from 'node:fs';
import * as http from 'node:http';
import { dirname } from 'node:path';

import { ClientServices, Config, PublicKey } from '@dxos/client';
import { fromHost } from '@dxos/client-services';
import { log } from '@dxos/log';
import { WebsocketRpcServer } from '@dxos/websocket-rpc';

import { addrFromSocket } from './util';

export type RunServicesParams = {
  profile: string;
  listen: string;
  config: Config;
};

export const runServices = async (params: RunServicesParams) => {
  const services = fromHost(params.config);

  await services.open();
  log.info('open');

  const httpServer = http.createServer();

  assert(params.listen.startsWith('unix://'), 'Invalid listen address.');
  const socketAddr = addrFromSocket(params.listen);
  mkdirSync(dirname(socketAddr), { recursive: true });
  rmSync(socketAddr, { force: true });
  httpServer.listen(socketAddr);

  const server = new WebsocketRpcServer<{}, ClientServices>({
    server: httpServer,
    onConnection: async () => {
      const id = PublicKey.random().toHex();
      log.info('connection', { id });

      return {
        exposed: services.descriptors,
        handlers: services.services as ClientServices,
        onOpen: async () => {
          log.info('open', { id });
        },
        onClose: async () => {
          log.info('close', { id });
        },
      };
    },
  });

  await server.open();
  log.info('listening', { socket: params.listen });
};
