//
// Copyright 2023 DXOS.org
//

import { Message as MessageType } from '@braneframe/types';
import { hasType } from '@dxos/echo-schema';
import { subscriptionHandler } from '@dxos/functions';

export const handler = subscriptionHandler(async ({ event, context }) => {
  const messages = event.objects?.filter(hasType<MessageType>(MessageType.schema));
  for (const message of messages ?? []) {
    console.log('---------');
    console.log({
      id: message.id,
      text: message.blocks[0].text,
    });
    console.log('---------');
  }
});
