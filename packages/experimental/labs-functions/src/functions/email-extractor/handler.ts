//
// Copyright 2023 DXOS.org
//

import { subscriptionHandler } from '@dxos/functions';

export const handler = subscriptionHandler(async ({ event, context }) => {
  console.log(event, context);
});
