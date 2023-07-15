//
// Copyright 2023 DXOS.org
//

import { FunctionContext } from '@dxos/functions';

export default (event: any, context: FunctionContext) => {
  const identity = context.client.halo.identity.get();
  // TODO(burdon): Random move.
  console.log('handler', event, identity?.profile?.displayName);
  return context.status(200).succeed({ event, greeting: `Hello, ${identity?.profile?.displayName}` });
};
