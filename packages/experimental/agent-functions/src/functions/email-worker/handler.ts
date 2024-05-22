//
// Copyright 2023 DXOS.org
//

import { MailboxType, MessageType, TextV0Type } from '@braneframe/types';
import { Filter, findObjectWithForeignKey } from '@dxos/echo-db';
import { create, foreignKey } from '@dxos/echo-schema';
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

export const handler: FunctionHandler<
  { spaceKey: string; data: { messages: EmailMessage[] } },
  { account: string }
> = async ({ event, context, response }) => {
  const {
    meta: { account = 'hello@dxos.network' },
    data: { messages },
    spaceKey,
  } = event.data;
  log.info('messages', { space: PublicKey.from(spaceKey), messages: messages.length });

  // TODO(burdon): Generic sync API.
  const space = context.client.spaces.get(PublicKey.from(spaceKey));
  if (!space) {
    return;
  }

  // TODO(burdon): Register schema (part of function metadata).
  try {
    const { client } = context;
    client.addSchema(TextV0Type, MailboxType, MessageType);
  } catch (err) {
    log.catch(err);
  }

  // Create mailbox if doesn't exist.
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
    // NOTE: If external DB is reset, it will start to number again from 1.
    let object = findObjectWithForeignKey(objects, { source: SOURCE_ID, id: String(message.id) });
    if (!object) {
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

      // TODO(burdon): ??= breaks the array?
      // (mailbox.messages ??= []).push(object);
      mailbox.messages?.push(object);
    }
  }

  return response.status(200);
};
