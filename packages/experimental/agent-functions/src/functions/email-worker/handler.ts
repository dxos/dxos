//
// Copyright 2023 DXOS.org
//

import { ChannelType, MessageType, TextType, ThreadType } from '@braneframe/types';
import { Filter, findObjectWithForeignKey } from '@dxos/echo-db';
import { create, foreignKey, S } from '@dxos/echo-schema';
import { type FunctionHandler } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type EmailMessage, SOURCE_ID } from './types';

/**
 * Trigger configuration.
 */
export const MetaSchema = S.mutable(
  S.Struct({
    account: S.optional(S.String),
  }),
);

export type Meta = S.Schema.Type<typeof MetaSchema>;

export const handler: FunctionHandler<{ spaceKey: string; data: { messages: EmailMessage[] } }, Meta> = async ({
  event,
  context,
  response,
}) => {
  const {
    meta: { account = 'hello@dxos.network' } = {},
    data: { messages },
    spaceKey,
  } = event.data;
  log.info('messages', { space: PublicKey.from(spaceKey), messages: messages.length });
  const space = context.client.spaces.get(PublicKey.from(spaceKey));
  if (!space) {
    return;
  }
  context.client.addTypes([ChannelType, MessageType, TextType]);

  // Create mailbox if doesn't exist.
  const { objects: mailboxes } = await space.db.query(Filter.schema(ChannelType)).run();
  let mailbox = findObjectWithForeignKey(mailboxes, { source: SOURCE_ID, id: account });
  if (!mailbox) {
    mailbox = space.db.add(
      create(
        ChannelType,
        {
          name: account,
          threads: [create(ThreadType, { name: 'Inbox', messages: [] })],
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

      mailbox.threads[0]?.messages?.push(object);
    }
  }

  return response.status(200);
};
