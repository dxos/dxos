//
// Copyright 2023 DXOS.org
//

import type { Config as ImapConfig } from 'imap';

import { Message as MessageType, Mailbox as MailboxType } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/client/echo';
import { type Space } from '@dxos/client/echo';
import { type Config } from '@dxos/config';
import { debug, matchKeys } from '@dxos/echo-schema';
import { type FunctionHandler } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { ImapProcessor } from './imap-processor';
import { getKey } from '../../util';

export const handler: FunctionHandler<any> = async ({
  event: { space: spaceKey, objects: mailboxIds },
  context: { client, status },
}) => {
  let code = 200;
  try {
    if (spaceKey) {
      const space = client.spaces.get(PublicKey.from(spaceKey))!;
      const { objects: mailboxes } = space.db.query(MailboxType.filter());
      for (const mailbox of mailboxes) {
        await processMailbox(client.config, space, mailbox);
      }
    } else {
      const { objects: mailboxes } = client.experimental.graph.query(MailboxType.filter());
      for (const mailbox of mailboxes) {
        // TODO(burdon): Undefined!
        console.log(mailbox);
        const space = getSpaceForObject(mailbox);
        if (space) {
          await processMailbox(client.config, space, mailbox);
        }
      }
    }
  } catch (err: any) {
    log.error(err);
    code = 500;
  }

  return status(code).succeed();
};

// TODO(burdon): Debounce requests (i.e., store seq).
const processMailbox = async (config: Config, space: Space, mailbox: MailboxType) => {
  const { objects: current = [] } = space.db.query(MessageType.filter()) ?? {};

  // TODO(burdon): Generalize util for getting properties from config/env.
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
  try {
    await processor.connect();

    // Merge messages.
    console.log('Requesting messages...', { current: current.length });
    const messages = await processor.requestMessages();
    console.log(messages.map((message) => message[debug]));
    for (const message of messages) {
      if (!current.find((m) => matchKeys(m.__meta.keys, message.__meta.keys))) {
        mailbox.messages.push(message);
        console.log('Adding', message[debug]);
      }
    }
  } finally {
    await processor.disconnect();
  }
};
