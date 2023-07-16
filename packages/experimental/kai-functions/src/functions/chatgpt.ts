//
// Copyright 2023 DXOS.org
//

import { FunctionContext } from '@dxos/functions';

export default async (event: any, context: FunctionContext) => {
  return context.status(200).succeed({ greeting: 'Hello' });
};
