//
// Copyright 2023 DXOS.org
//

import { subscriptionHandler } from '@dxos/functions';

export const handler = subscriptionHandler(async ({ event, context, response }) => {
  const { space, objects } = event;
  const { client } = context;

  // TODO(burdon): Generalize util for getting properties from config/env.
  const config = client.config;
});
