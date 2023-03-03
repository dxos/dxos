//
// Copyright 2023 DXOS.org
//

import { Client, Config, fromHost, PublicKey } from '@dxos/client';
import { ClientServices } from '@dxos/client-services';
import { log } from '@dxos/log';
import { WebsocketRpcServer } from '@dxos/websocket-rpc';

const rpcPort = parseInt(process.env.DX_RPC_PORT ?? '3023');

// TODO(burdon): Load from disk (add to image).
const config = new Config({
  runtime: {
    client: {
      storage: {
        persistent: true,
        path: './dxos_client_storage'
      }
    },
    services: {
      signal: {
        server: 'wss://dev.kube.dxos.org/.well-known/dx/signal'
      },
      ice: [
        {
          urls: 'stun:demo.kube.dxos.org:3478',
          username: 'dxos',
          credential: 'dxos'
        },
        {
          urls: 'turn:demo.kube.dxos.org:3478',
          username: 'dxos',
          credential: 'dxos'
        },
        {
          urls: 'stun:dev.kube.dxos.org:3478'
        },
        {
          urls: 'turn:dev.kube.dxos.org:3478',
          username: 'dxos',
          credential: 'dxos'
        }
      ]
    }
  }
});

/**
 * Node process running Bot.
 * Starts a websocket server implementing remote DXOS client services.
 */
const init = async () => {
  log.info('config', { config: config.values });
  const client = new Client({
    config,
    services: fromHost(config)
  });

  await client.initialize();
  log.info('client initialized', {
    identity: client.halo.identity?.identityKey,
    spaces: client.echo.getSpaces().map((space) => space.key.toHex())
  });

  const server = new WebsocketRpcServer<{}, ClientServices>({
    port: rpcPort,
    onConnection: async (info) => {
      const id = PublicKey.random().toHex();
      log.info('connection', { id });

      return {
        exposed: client.services.descriptors,
        handlers: client.services.services as ClientServices,
        onOpen: async () => {
          log.info('open', { id });
        },
        onClose: async () => {
          log.info('close', { id });
        }
      };
    }
  });

  await server.open();
  log.info('listening ', { rpcPort });

  // TODO(burdon): Add bot code here (env var?)
  log.info('Created bot:', process.env.BOT_NAME);
  client.echo.subscribeSpaces((spaces) => {
    if (spaces.length) {
      // TODO(burdon): Will create a new subscription each time spaces update!
      const space = spaces[0];
      const query = space.db.query();
      query.subscribe((query) => {
        log.info('objects', query.objects.length);
      });
    }
  });
};

void init();
