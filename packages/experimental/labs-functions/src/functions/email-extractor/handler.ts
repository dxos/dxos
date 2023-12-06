//
// Copyright 2023 DXOS.org
//

import { Message as MessageType } from '@braneframe/types';
import { hasType } from '@dxos/echo-schema';
import { subscriptionHandler } from '@dxos/functions';

export const handler = subscriptionHandler(async ({ event: { space, objects }, context }) => {
  let messages: MessageType[];
  if (objects) {
    messages = objects.filter(hasType<MessageType>(MessageType.schema));
  } else {
    messages = space!.db.query(MessageType.filter({ type: 'email' })).objects;
  }

  for (const message of messages ?? []) {
    const { email, name } = message.from; // TODO(burdon): Bug: https://github.com/dxos/dxos/issues/4880
    console.log('---------');
    console.log({ to: message.to });
    console.log({ email, name });
    console.log('---------');
  }
});

// TODO(burdon): Merge contacts with multiple emails?
// TODO(burdon): Defined vs. runtime types for contacts.
