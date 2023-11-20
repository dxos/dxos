//
// Copyright 2023 DXOS.org
//

import type { Config as ImapConfig } from 'imap';

import { debug } from '@dxos/echo-schema';
import { type FunctionHandler } from '@dxos/functions';
import { log } from '@dxos/log';

import { ImapProcessor } from './imap-processor';
import { getKey } from '../../util';

export const handler: FunctionHandler<any> = async ({ event, context: { client, status } }) => {
  const config = client.config;

  // TODO(burdon): Generalize getting properties (e.g., from env/config).
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

  let code = 200;
  const processor = new ImapProcessor('protonmail.com', imapConfig);
  try {
    await processor.connect();

    // TODO(burdon): Merge to thread.
    // TODO(burdon): Set meta keys.
    const messages = await processor.requestMessages();
    console.log(messages.map((message) => message[debug]));
  } catch (err: any) {
    log.error(err);
    code = 500;
  } finally {
    await processor.disconnect();
  }

  return status(code).succeed();
};
