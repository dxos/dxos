//
// Copyright 2023 DXOS.org
//

import { IdentityDid } from '@dxos/keys';
import { create, makeRef } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { MessageType } from '@dxos/schema';

import { MailboxType } from '../types';

faker.seed(1);

export const createInbox = (count = 10) => {
  // const now = new Date();

  // TODO(burdon): Timestamp.
  return create(MailboxType, {
    queue: {
      items: faker.helpers.multiple(
        () =>
          makeRef(
            create(MessageType, {
              sender: {
                identityDid: IdentityDid.random(),
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
    } as any,
  });
};
