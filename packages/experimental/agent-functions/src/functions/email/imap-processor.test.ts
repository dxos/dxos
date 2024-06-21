//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { ImapProcessor } from './imap-processor';
import { getConfig, getKey } from '../../util';

// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('IMAP processor', () => {
  let processor: ImapProcessor | undefined;

  before(async () => {
    const config = getConfig()!;
    processor = new ImapProcessor('protonmail.com', {
      user: process.env.COM_PROTONMAIL_USERNAME ?? getKey(config, 'protonmail.com/username')!,
      password: process.env.COM_PROTONMAIL_PASSWORD ?? getKey(config, 'protonmail.com/password')!,
      host: process.env.COM_PROTONMAIL_HOST ?? '127.0.0.1',
      port: process.env.COM_PROTONMAIL_PORT ? parseInt(process.env.COM_PROTONMAIL_PORT) : 1143,
      tls: true,
      tlsOptions: {
        // ca: process.env.COM_PROTONMAIL_CERT ?? getKey(config, 'protonmail.com/ca'),
        rejectUnauthorized: false,
      },
    });

    await processor.connect();
  });

  after(async () => {
    await processor?.disconnect();
  });

  // eslint-disable-next-line mocha/no-skipped-tests
  test('basic', async () => {
    const messages = await processor!.requestMessages();

    const mapped = messages
      .map((message) => ({
        date: message.timestamp,
        to: message.properties?.to?.[0]?.email,
        from: message.sender?.email,
        subject: message.properties?.subject,
        body: message.text?.length,
      }))
      .sort(({ date: a }, { date: b }) => {
        if (a == null || b == null) {
          return a === b ? 0 : b == null ? -1 : 1;
        }
        return new Date(a).getTime() - new Date(b).getTime();
      });

    console.log('messages', JSON.stringify(mapped, undefined, 2));
    expect(mapped).to.have.length.greaterThan(0);
  });
});
