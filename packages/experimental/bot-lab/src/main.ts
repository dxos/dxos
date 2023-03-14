//
// Copyright 2023 DXOS.org
//

import { Client, ClientServices, Config, PublicKey, Space } from '@dxos/client';
import { fromHost } from '@dxos/client-services';
import { Bot, ChessBot, KaiBot, MailBot, StoreBot, TravelBot } from '@dxos/kai-bots';
import { log } from '@dxos/log';
import { WebsocketRpcServer } from '@dxos/websocket-rpc';

import { DX_BOT_CONTAINER_RPC_PORT } from './defs';

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
        server: 'wss://kube.dxos.org/.well-known/dx/signal'
      },
      ice: [
        {
          urls: 'stun:kube.dxos.org:3478',
          username: 'dxos',
          credential: 'dxos'
        },
        {
          urls: 'turn:kube.dxos.org:3478',
          username: 'dxos',
          credential: 'dxos'
        }
      ]
    }
  }
});

const rpcPort = process.env.DX_BOT_CONTAINER_RPC_PORT
  ? parseInt(process.env.DX_BOT_CONTAINER_RPC_PORT)
  : DX_BOT_CONTAINER_RPC_PORT;

/**
 * Node process running Bot.
 * Starts a websocket server implementing remote DXOS client services.
 */
const start = async () => {
  log.info('env', process.env);
  log.info('config', { config: config.values });
  const client = new Client({
    config,
    services: fromHost(config)
  });

  // TODO(burdon): When is the identity created?
  await client.initialize();
  log.info('client initialized', { identity: client.halo.identity?.identityKey });

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

  let bot: Bot | undefined;
  // TODO(burdon): Reconcile this subscription with the ECHO db.query.
  const onUpdate = async (spaces: Space[]) => {
    if (spaces.length) {
      const space = spaces[0];
      log.info('joined', { space: space.key });
      if (!bot) {
        bot = createBot(process.env.BOT_NAME);
        await bot.init(config, space);
        await bot.start();
      }
    }
  };

  // TODO(burdon): Fix race condition? Trigger callback on subscription.
  void onUpdate(client.echo.getSpaces());
  client.echo.subscribeSpaces(onUpdate);

  const printStatus = () => {
    log.info('status', {
      bot: bot?.constructor.name,
      identity: client.halo.identity,
      spaces: client.echo.getSpaces().map((space) => ({
        key: space.key,
        title: space.properties.title,
        members: space.getMembers()
      }))
    });
  };

  printStatus();
  setInterval(printStatus, 60_000);
};

const createBot = (bot?: string): Bot => {
  log.info('creating bot', { bot });

  switch (bot) {
    case 'dxos.module.bot.chess': {
      return new ChessBot();
    }

    case 'dxos.module.bot.kai': {
      return new KaiBot();
    }

    case 'dxos.module.bot.mail': {
      return new MailBot();
    }

    case 'dxos.module.bot.store': {
      return new StoreBot();
    }

    case 'dxos.module.bot.travel': {
      return new TravelBot();
    }

    default: {
      throw new Error(`Invalid bot type: ${bot}`);
    }
  }
};

// TODO(burdon): Create class.
void start();
