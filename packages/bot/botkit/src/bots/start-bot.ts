//
// Copyright 2021 DXOS.org
//

import { schema } from '@dxos/protocols';
import { BotService } from '@dxos/protocols/proto/dxos/bot';
import { createRpcServer, RpcPort } from '@dxos/rpc';

export const startBot = async (bot: BotService, port: RpcPort) => {
  const rpc = createRpcServer({
    service: schema.getService('dxos.bot.BotService'),
    port,
    handlers: bot
  });

  await rpc.open();
};
