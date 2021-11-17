//
// Copyright 2021 DXOS.org
//

import { createRpcServer, RpcPort } from '@dxos/rpc';

import { schema } from '../proto/gen';
import { BotService } from '../proto/gen/dxos/bot';

export const startBot = async (bot: BotService, port: RpcPort) => {
  const rpc = createRpcServer({
    service: schema.getService('dxos.bot.BotService'),
    port,
    handlers: bot
  });

  await rpc.open();
};
