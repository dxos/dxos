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

    const show = messages.map((message) => ({
      date: message.date,
      from: message.from?.address,
      subject: message.subject,
      body: message.body?.length
    }));

    console.log('messages', JSON.stringify(show, undefined, 2));
  });
});
