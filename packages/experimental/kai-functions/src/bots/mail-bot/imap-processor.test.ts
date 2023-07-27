//
// Copyright 2023 DXOS.org
//

import assert from 'assert';

import { describe, test } from '@dxos/test';

import { getConfig, getKey } from '../util';
import { ImapProcessor } from './imap-processor';

// TODO(burdon): Set-up in-memory test for CI.

// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('IMAP processor', () => {
  // eslint-disable-next-line mocha/no-skipped-tests
  test('basic', async () => {
    const config = getConfig(process.env.TEST_CONFIG);
    assert(config);

    const processor = new ImapProcessor('dxos.module.bot.mail', {
      user: process.env.COM_PROTONMAIL_USERNAME!,
      password: process.env.COM_PROTONMAIL_PASSWORD!,
      host: process.env.COM_PROTONMAIL_HOST ?? '127.0.0.1',
      port: process.env.COM_PROTONMAIL_PORT ? parseInt(process.env.COM_PROTONMAIL_PORT) : 1143,
      tls: false,
      tlsOptions: {
        ca: process.env.COM_PROTONMAIL_CERT ?? getKey(config, 'com.protonmail.ca'),
        rejectUnauthorized: false,
      },
    });

    const messages = await processor.requestMessages();

    const mapped = messages
      .map((message) => ({
        date: message.date,
        to: message.to[0]?.email,
        from: message.from?.email,
        subject: message.subject,
        body: message.body?.length,
      }))
      .sort(({ date: a }, { date: b }) => (a < b ? 1 : a > b ? -1 : 0));

    console.log('messages', JSON.stringify(mapped, undefined, 2));
  });
});
