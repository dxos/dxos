//
// Copyright 2023 DXOS.org
//

import { ThreadType, MessageType } from '@braneframe/types';
import * as E from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { PublicKey } from '@dxos/react-client';

faker.seed(1);

export const createInbox = (count = 10) => {
  // const now = new Date();

  // TODO(burdon): Timestamp.
  return E.object(ThreadType, {
    messages: faker.helpers.multiple(
      () =>
        E.object(MessageType, {
          from: {
            identityKey: PublicKey.random().toHex(),
          },
          subject: faker.lorem.sentence(),
          blocks: [],
        }),
      { count },
    ),
  });
};
