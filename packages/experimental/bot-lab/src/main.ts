//
// Copyright 2023 DXOS.org
//

import { Client, Config, fromHost, PublicKey } from '@dxos/client';
import { ClientServices } from '@dxos/client-services';
import { ChessBot, MailBot } from '@dxos/kai-bots';
import { log } from '@dxos/log';
import { WebsocketRpcServer } from '@dxos/websocket-rpc';

// TODO(burdon): Factor out port number.
const rpcPort = process.env.DX_RPC_PORT ? parseInt(process.env.DX_RPC_PORT) : 3023;

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
    onConnection: async () => {
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

  log.info('ENV', process.env);

  client.echo.subscribeSpaces(async (spaces) => {
    if (spaces.length) {
      const space = spaces[0];
      const bot = createBot(process.env.BOT_NAME);
      if (bot) {
        await bot.init(config, space);
        await bot.start();
      }
    }
  });
};

const createBot = (bot?: string) => {
  log.info('creating bot', { bot });

  switch (bot) {
    case 'dxos.module.bot.chess': {
      return new ChessBot();
    }

    case 'dxos.module.bot.mail': {
      return new MailBot();
    }
  }
};

void init();
