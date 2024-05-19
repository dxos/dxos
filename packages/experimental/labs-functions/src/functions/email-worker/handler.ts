//
// Copyright 2023 DXOS.org
//

import { MailboxType, MessageType } from '@braneframe/types';
import { Filter, findObjectWithForeignKey } from '@dxos/echo-db';
import { create, getTypename } from '@dxos/echo-schema';
import { type FunctionHandler } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

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
  const mailbox = findObjectWithForeignKey(mailboxes, { source: SOURCE_ID, id: account });
  if (!mailbox) {
    space.db.add(
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
    const current = findObjectWithForeignKey(objects, { source: SOURCE_ID, id: String(message.id) });
    if (!current) {
      log.info('insert', { type: getTypename(message), id: message.id });
      space.db.add(
        create(
          MessageType,
          {
            to: [{ email: message.to }],
            from: { email: message.from },
            subject: message.subject,
            // TODO(burdon): Add message block.
            blocks: [
              // {
              //   timestamp: message.created,
              //   content: message.body,
              // },
            ],
          },
          {
            keys: [
              {
                source: SOURCE_ID,
                id: String(message.id),
              },
            ],
          },
        ),
      );
    }
  }

  return response.status(200);
};
