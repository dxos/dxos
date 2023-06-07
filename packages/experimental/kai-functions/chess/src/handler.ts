//
// Copyright 2023 DXOS.org
//

import { Client, Config, fromSocket } from '@dxos/client';

module.exports = async (event: any, context: any) => {
  console.log('handler', JSON.stringify(event));

  const clientUrl = event?.body?.context?.clientUrl;
  if (!clientUrl) {
    return context.status(400);
  }

  const client = new Client({ config: new Config({}), services: fromSocket(clientUrl) });
  await client.initialize();
  console.log('client initialized', JSON.stringify(client.config));

  // TODO(burdon): Query for objects (or from event?)
  // TODO(burdon): Port game state from chess-bot.

  return context.status(200).succeed({ identity: client.halo.identity.get()?.identityKey.toHex() });
};
