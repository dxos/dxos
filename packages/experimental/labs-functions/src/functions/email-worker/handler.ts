//
// Copyright 2023 DXOS.org
//

import { MessageType } from '@braneframe/types';
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

  const SOURCE_ID = 'cloudflare';

  const { results } = await space.db.query(Filter.schema(MessageType)).run();
  for (const message of messages) {
    const current = results.find((result) => {
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
          // {
          //   keys: [
          //     {
          //       source: SOURCE_ID
          //     }
          //   ],
          // },
        ),
      );
    }
  }

  return response.status(200);
};
