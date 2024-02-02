//
// Copyright 2023 DXOS.org
//

import { Thread as ThreadType, Message as MessageType } from '@braneframe/types';
import { faker } from '@dxos/random';
import { PublicKey } from '@dxos/react-client';

faker.seed(1);

export const createInbox = (count = 10) => {
  // const now = new Date();

  // TODO(burdon): Timestamp.
  return new ThreadType({
    messages: faker.helpers.multiple(
      () =>
        new MessageType({
          from: {
            identityKey: PublicKey.random().toHex(),
          },
          subject: faker.lorem.sentence(),
        }),
      { count },
    ),
  });
};
