//
// Copyright 2023 DXOS.org
//

import { MailboxType, MessageType, TextV0Type } from '@braneframe/types';
import { Filter, findObjectWithForeignKey } from '@dxos/echo-db';
import { create, foreignKey, getTypename } from '@dxos/echo-schema';
import { type FunctionHandler } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

// TODO(burdon): Factor out.
export const text = (content: string) => create(TextV0Type, { content });

// TODO(burdon): Import type from lib.
export type EmailMessage = {
  id: number;
  status?: string;
  created: number;
  from: string;
  to: string;
  subject: string;
  body: string;
};

const SOURCE_ID = 'hub.dxos.network/mailbox';

export const handler: FunctionHandler<{ spaceKey: string; data: { messages: EmailMessage[] } }> = async ({
  event,
  context,
  response,
}) => {
  const {
    spaceKey,
    data: { messages },
  } = event;
  log.info('messages', { spaceKey, messages: messages.length });

  // TODO(burdon): Generic sync API.
  const space = context.client.spaces.get(PublicKey.from(spaceKey));
  if (!space) {
    return;
  }

  // Create mailbox if doesn't exist.
  const { account } = context.data ?? { account: 'hello@dxos.network' };
  const { objects: mailboxes } = await space.db.query(Filter.schema(MailboxType)).run();
  let mailbox = findObjectWithForeignKey(mailboxes, { source: SOURCE_ID, id: account });
  if (!mailbox) {
    mailbox = space.db.add(
      create(
        MailboxType,
        {
          title: account,
          messages: [],
        },
        {
          keys: [
            {
              source: SOURCE_ID,
              id: account,
            },
          ],
        },
      ),
    );
  }

  const { objects } = await space.db.query(Filter.schema(MessageType)).run();
  for (const message of messages) {
    let object = findObjectWithForeignKey(objects, { source: SOURCE_ID, id: String(message.id) });
    if (!object) {
      log.info('insert', { type: getTypename(message), id: message.id });
      object = space.db.add(
        create(
          MessageType,
          {
            to: [{ email: message.to }],
            from: { email: message.from },
            subject: message.subject,
            date: new Date(message.created).toISOString(),
            blocks: [
              {
                timestamp: new Date(message.created).toISOString(),
                content: text(message.body),
              },
            ],
          },
          {
            keys: [foreignKey(SOURCE_ID, String(message.id))],
          },
        ),
      );

      (mailbox.messages ??= []).push(object);
    } else {
      log.info('update', { type: getTypename(message), id: message.id });

      // TODO(burdon): Temp.
      object.date = new Date(message.created).toISOString();
      object.blocks = [
        {
          timestamp: new Date(message.created).toISOString(),
          content: text(message.body),
        },
      ];

      // TODO(burdon): Possibly undefined.
      if (!mailbox.messages?.find((message) => message!.id === object!.id)) {
        (mailbox.messages ??= []).push(object);
      }
    }
  }

  return response.status(200);
};
