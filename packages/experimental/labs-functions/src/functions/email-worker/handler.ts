//
// Copyright 2023 DXOS.org
//

import { MailboxType, MessageType } from '@braneframe/types';
import { Filter } from '@dxos/echo-db';
import { create, getMeta } from '@dxos/echo-schema';
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

  const { account } = context.data;
  const { objects: mailboxes } = await space.db.query(Filter.schema(MailboxType)).run();
  const mailbox = mailboxes.find((mailbox) => mailbox.id === account);

  const SOURCE_ID = 'hub.dxos.network/mailbox';

  const { objects } = await space.db.query(Filter.schema(MessageType)).run();
  for (const message of messages) {
    // TODO(burdon): Impl query by meta.
    const current = objects.find((result) => {
      return getMeta(result).keys.find(({ source, id }) => source === SOURCE_ID && id === String(message.id));
    });

    if (!current) {
      log.info('insert', { message });

      // TODO(burdon): Set meta keys.
      space.db.add(
        create(
          MessageType,
          {
            to: [{ email: message.to }],
            from: { email: message.from },
            subject: message.subject,
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
