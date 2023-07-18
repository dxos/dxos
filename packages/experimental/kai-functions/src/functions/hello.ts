//
// Copyright 2023 DXOS.org
//

import { FunctionContext } from '@dxos/functions';

export default async (event: any, context: FunctionContext) => {
  const identity = context.client.halo.identity.get();
  return context.status(200).succeed({ message: `Hello, ${identity?.profile?.displayName}` });
};
