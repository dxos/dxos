//
// Copyright 2023 DXOS.org
//

import sortKeys from 'sort-keys';

import { Client, PublicKey } from '@dxos/client';
import { Space, SpaceState } from '@dxos/client/echo';
import { ClientServices, fromHost } from '@dxos/client/services';
import { Bot, ChessBot, KaiBot, MailBot, StoreBot, TravelBot } from '@dxos/labs-functions';
import { log } from '@dxos/log';
import { WebsocketRpcServer } from '@dxos/websocket-rpc';

import { DX_BOT_CONTAINER_RPC_PORT } from './defs';
import { getConfig } from '../config';

const rpcPort = process.env.DX_BOT_CONTAINER_RPC_PORT
  ? parseInt(process.env.DX_BOT_CONTAINER_RPC_PORT)
  : DX_BOT_CONTAINER_RPC_PORT;

/**
 * Node process running Bot.
 * Starts a websocket server implementing remote DXOS client services.
 */
const start = async () => {
  // TODO(burdon): Factor out.
  log.info(
    'env',
    sortKeys(
      Object.entries(process.env).reduce<any>((result, [key, value]) => {
        result[key] = value;
        return result;
      }, {}),
      { deep: true },
    ),
  );

  // TODO(burdon): Set logging from client.
  // TODO(burdon): Update via ENV from client.
  const config = getConfig();
  log.info('config', { config: config.values });

  const client = new Client({
    config,
    services: fromHost(config),
  });

  await client.initialize();
  log.info('client initialized', { identity: client.halo.identity.get()?.identityKey });

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
        },
      };
    },
  });

  await server.open();
  log.info('listening', { rpcPort });

  let bot: Bot | undefined;
  // TODO(burdon): Reconcile this subscription with the ECHO db.query.
  const onUpdate = async (spaces: Space[]) => {
    if (spaces.length) {
      const space = spaces[0];
      if (space.state.get() !== SpaceState.READY) {
        return;
      }

      log.info('joined', { space: space.key });
      if (!bot) {
        bot = createBot(process.env.DX_BOT_NAME);
        try {
          await bot.init(config, space);
          await bot.start();
        } catch (err) {
          await server.close();
          process.exit(1);
        }
      }
    }
  };

  // TODO(burdon): Fix race condition? Trigger callback on subscription.
  void onUpdate(client.spaces.get());
  // TODO(wittjosiah): Unsubscribe on exit.
  client.spaces.subscribe(onUpdate);

  const printStatus = () => {
    log.info('status', {
      bot: bot?.toString(),
      identity: client.halo.identity.get(),
      spaces: client.spaces.get().map((space) => ({
        key: space.key,
        title: space.properties.name,
        members: space.members.get(),
      })),
    });
  };

  // TODO(wittjosiah): Unsubscribe on exit.
  setInterval(printStatus, 60_000);
  printStatus();
};

const createBot = (botId?: string): Bot => {
  if (botId) {
    log.info('creating bot', { botId });
    const BotConstructor = botRegistry[botId];
    if (BotConstructor) {
      return new BotConstructor(botId);
    }
  }

  throw new Error(`Invalid bot type: ${botId}`);
};

// TODO(burdon): DMG.
const botRegistry: { [id: string]: new (botId: string) => Bot } = {
  'dxos.module.bot.chess': ChessBot,
  'dxos.module.bot.kai': KaiBot,
  'dxos.module.bot.mail': MailBot,
  'dxos.module.bot.store': StoreBot,
  'dxos.module.bot.travel': TravelBot,
};

// TODO(burdon): Create class.
void start();
