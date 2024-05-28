//
// Copyright 2023 DXOS.org
//

import { ThreadType, MessageType } from '@braneframe/types';
import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { PublicKey } from '@dxos/react-client';

faker.seed(1);

const createRandomBlock = () => {
  return {
    timestamp: faker.date.recent().toISOString(),
    content: {
      id: faker.string.uuid(),
      content: faker.lorem.paragraph(),
    },
  };
};

export const createInbox = (count = 10) => {
  // const now = new Date();

  // TODO(burdon): Timestamp.
  return create(ThreadType, {
    messages: faker.helpers.multiple(
      () =>
        create(MessageType, {
          from: {
            identityKey: PublicKey.random().toHex(),
            name: faker.person.fullName(),
          },
          subject: faker.commerce.productName(),
          blocks: [
            // Between 1-3 blocks.
            ...faker.helpers.multiple(createRandomBlock, { count: faker.number.int({ min: 1, max: 3 }) }),
          ],
        }),
      { count },
    ),
  });
};
