//
// Copyright 2023 DXOS.org
//

import { FunctionContext } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';

export default async (event: any, context: FunctionContext) => {
  const space = context.client.getSpace(PublicKey.from(event.space))!;
  console.log('GPT-3', space.key.truncate());
  return context.status(200).succeed({ greeting: 'Hello' });
};
