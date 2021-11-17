//
// Copyright 2021 DXOS.org
//

import { sleep } from '@dxos/async';
import { createRpcServer, RpcPort } from '@dxos/rpc';
import debug from 'debug'

import { schema } from '../proto/gen';
import { BotService } from '../proto/gen/dxos/bot';

const log = debug('dxos:botkit:start-bot')


export const startBot = async (bot: BotService, port: RpcPort) => {
  const rpc = createRpcServer({
    service: schema.getService('dxos.bot.BotService'),
    port,
    handlers: bot
  });

  log('Openning BotService server RPC...')

  await rpc.open();

  log('Done openning BotService server RPC')
};
