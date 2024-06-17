//
// Copyright 2023 DXOS.org
//

import { ThreadType, MessageType } from '@braneframe/types';
import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { PublicKey } from '@dxos/react-client';

faker.seed(1);

export const createInbox = (count = 10) => {
  // const now = new Date();

  // TODO(burdon): Timestamp.
  return create(ThreadType, {
    messages: faker.helpers.multiple(
      () =>
        create(MessageType, {
          sender: {
            identityKey: PublicKey.random().toHex(),
            name: faker.person.fullName(),
          },
          timestamp: faker.date.recent().toISOString(),
          text: faker.lorem.paragraph(),
          properties: {
            subject: faker.commerce.productName(),
          },
        }),
      { count },
    ),
  });
};
