//
// Copyright 2023 DXOS.org
//

import type { Config as ImapConfig } from 'imap';

import { MailboxType, MessageType } from '@braneframe/types';
import { getSpace, type Space } from '@dxos/client/echo';
import { Filter, hasType, matchKeys } from '@dxos/echo-db';
import { getMeta } from '@dxos/echo-schema';
import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { ImapProcessor } from './imap-processor';
import { getKey, registerTypes } from '../../util';

export const handler = subscriptionHandler(async ({ event, context, response }) => {
  const { space, objects } = event.data;
  const { client } = context;
  invariant(space);
  registerTypes(space);

  // TODO(burdon): Generalize util for getting properties from config/env.
  const config = client.config;
  const imapConfig: ImapConfig = {
    user: process.env.COM_PROTONMAIL_USERNAME ?? getKey(config, 'protonmail.com/username')!,
    password: process.env.COM_PROTONMAIL_PASSWORD ?? getKey(config, 'protonmail.com/password')!,
    host: process.env.COM_PROTONMAIL_HOST ?? '127.0.0.1',
    port: process.env.COM_PROTONMAIL_PORT ? parseInt(process.env.COM_PROTONMAIL_PORT) : 1143,
    tls: true,
    tlsOptions: {
      // ca: process.env.COM_PROTONMAIL_CERT ?? getKey(config, 'protonmail.com/ca'),
      rejectUnauthorized: false,
    },
  };

  const processor = new ImapProcessor('protonmail.com', imapConfig);

  let code = 200;
  try {
    const mailboxes: MailboxType[] = objects?.filter(hasType(MailboxType)) ?? [];
    if (!space) {
      const { objects } = await client.experimental.graph.query(Filter.schema(MailboxType)).run();
      mailboxes.push(...objects);
    }

    if (mailboxes.length) {
      await processor.connect();

      for (const mailbox of mailboxes) {
        const space = getSpace(mailbox);
        invariant(space);
        // TODO(burdon): Debounce requests (i.e., store seq).
        log('requesting messages...');
        const messages = await processor.requestMessages({ days: 60 });
        await processMailbox(space, mailbox, messages);
      }
    }
  } catch (err: any) {
    log.error(err);
    code = 500;
  } finally {
    await processor.disconnect();
  }

  return response.status(code);
});

// TODO(burdon): Util.
const processMailbox = async (space: Space, mailbox: MailboxType, messages: MessageType[]) => {
  const { objects: current = [] } = (await space.db.query(Filter.schema(MessageType)).run()) ?? {};

  // Merge messages.
  // console.log(messages.map((message) => message[debug]));
  let added = 0;
  for (const message of messages) {
    const exists = current.find((m) => matchKeys(getMeta(m).keys, getMeta(message).keys));
    if (!exists) {
      (mailbox.messages ??= []).push(message);
      added++;
    }
  }

  log('processed', { messages: messages.length, added });
};
