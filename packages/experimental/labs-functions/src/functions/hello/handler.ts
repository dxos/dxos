//
// Copyright 2023 DXOS.org
//

import { type FunctionHandler } from '@dxos/functions';

export const handler: FunctionHandler<any> = async ({ event, context }) => {
  const identity = context.client.halo.identity.get();
  return context.status(200).succeed({ message: `Hello, ${identity?.profile?.displayName}` });
};
