//
// Copyright 2023 DXOS.org
//

import { create, makeRef } from '@dxos/live-object';
import { ThreadType } from '@dxos/plugin-space/types';
import { faker } from '@dxos/random';
import { PublicKey } from '@dxos/react-client';
import { MessageType } from '@dxos/schema';

faker.seed(1);

export const createInbox = (count = 10) => {
  // const now = new Date();

  // TODO(burdon): Timestamp.
  return create(ThreadType, {
    messages: faker.helpers.multiple(
      () =>
        makeRef(
          create(MessageType, {
            sender: {
              identityKey: PublicKey.random().toHex(),
              name: faker.person.fullName(),
            },
            created: faker.date.recent().toISOString(),
            blocks: [{ type: 'text', text: faker.lorem.paragraph() }],
            properties: {
              subject: faker.commerce.productName(),
            },
          }),
        ),
      { count },
    ),
  });
};
