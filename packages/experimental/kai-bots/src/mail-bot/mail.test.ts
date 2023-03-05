//
// Copyright 2023 DXOS.org
//

import { Client } from '@dxos/client';
import { describe, test } from '@dxos/test';

import { getConfig } from '../util';
import { MailBot } from './mail-bot';

describe('Mail', () => {
  test('IMAP', async () => {
    const config = getConfig()!;
    const client = new Client({ config });
    await client.initialize();

    const space = await client.echo.createSpace();

    const bot = new MailBot();
    await bot.init(config, space);

    const messages = await bot.requestMessages();

    const mapped = messages
      .map((message) => ({
        date: message.date,
        to: message.to[0]?.email,
        from: message.from?.email,
        subject: message.subject,
        body: message.body?.length
      }))
      .sort(({ date: a }, { date: b }) => (a < b ? 1 : a > b ? -1 : 0));

    console.log('messages', JSON.stringify(mapped, undefined, 2));
  });
});
