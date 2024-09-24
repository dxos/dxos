//
// Copyright 2023 DXOS.org
//

import { findObjectWithForeignKey } from '@dxos/echo-db';
import { create, foreignKey } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { MailboxType } from '@dxos/plugin-inbox';
import { MessageType } from '@dxos/plugin-space/types';
import { type Space, Filter } from '@dxos/react-client/echo';

export const SOURCE_ID = 'hub.dxos.network/mailbox';

export const handleEmail = async (space: Space, data: any) => {
  const { messages } = data;

  // Create mailbox if doesn't exist.
  const { objects: mailboxes } = await space.db.query(Filter.schema(MailboxType)).run();
  const mailbox = mailboxes[0] ?? space.db.add(create(MailboxType, { messages: [] }));

  log.info('messages', { count: messages.length, existingMailbox: mailboxes.length > 0 });

  const { objects } = await space.db.query(Filter.schema(MessageType)).run();
  for (const message of messages) {
    let object = findObjectWithForeignKey(objects, { source: SOURCE_ID, id: String(message.id) });
    if (!object) {
      object = space.db.add(
        create(
          MessageType,
          {
            sender: { email: message.from },
            timestamp: new Date(message.created).toISOString(),
            text: message.body,
            properties: {
              subject: message.subject,
              to: [{ email: message.to }],
            },
          },
          {
            keys: [foreignKey(SOURCE_ID, String(message.id))],
          },
        ),
      );
      mailbox.messages?.push(object);
    }
  }
  return 200;
};
