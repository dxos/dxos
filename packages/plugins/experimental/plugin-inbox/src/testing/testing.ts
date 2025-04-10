//
// Copyright 2023 DXOS.org
//

import { IdentityDid } from '@dxos/keys';
import { create } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { MessageType } from '@dxos/schema';

import type { MailboxProps } from '../components/Mailbox/Mailbox';

faker.seed(1);

export const createInbox = (count = 10) => {
  // const now = new Date();

  // TODO(burdon): Timestamp.
  return {
    queue: {
      items: faker.helpers.multiple(
        () =>
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
        { count },
      ),
    } as NonNullable<MailboxProps['messagesQueue']>,
  };
};
