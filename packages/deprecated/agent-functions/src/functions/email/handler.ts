//
// Copyright 2023 DXOS.org
//

import type { Config as ImapConfig } from 'imap';

import { getMeta, getSpace, Ref, type Space } from '@dxos/client/echo';
import { Filter, hasType, matchKeys } from '@dxos/echo-db';
import { subscriptionHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ChannelType } from '@dxos/plugin-space/types';
import { DataType } from '@dxos/schema';

import { ImapProcessor } from './imap-processor';
import { getKey } from '../../util';

const types = [DataType.Text, ChannelType, DataType.Message];

export const handler = subscriptionHandler(async ({ event, context, response }) => {
  const { client } = context;
  const { space, objects } = event.data;
  invariant(space);

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
    const mailboxes: ChannelType[] = objects?.filter(hasType(ChannelType)) ?? [];
    if (!space) {
      // Query across all spaces.
      const { objects } = await client.graph.query(Filter.schema(ChannelType)).run();
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
}, types);

// TODO(burdon): Util.
const processMailbox = async (space: Space, mailbox: ChannelType, messages: DataType.Message[]) => {
  const { objects: current = [] } = (await space.db.query(Filter.schema(DataType.Message)).run()) ?? {};

  // Merge messages.
  // console.log(messages.map((message) => message[debug]));
  let added = 0;
  for (const message of messages) {
    const exists = current.find((m) => matchKeys(getMeta(m).keys, getMeta(message).keys));
    if (!exists) {
      (mailbox.threads[0].target!.messages ??= []).push(Ref.make(message));
      added++;
    }
  }

  log('processed', { messages: messages.length, added });
};
