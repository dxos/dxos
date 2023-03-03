//
// Copyright 2023 DXOS.org
//

import fs from 'fs';
import imaps from 'imap-simple';
import path from 'path';

import { describe, test } from '@dxos/test';

// Protonmail bridge as alternative to Gmail, which requires a registered Google workspace.
// https://proton.me/blog/bridge-security-model
// Runs local IMAP server.
// NOTE: Configure bridge settings: SSL; download the cert.

describe('Mail', () => {
  const config = {
    user: process.env.PROTONMAIL_USERNAME!,
    password: process.env.PROTONMAIL_PASSWORD!,
    host: '127.0.0.1',
    port: 1143,
    tls: true,
    tlsOptions: {
      ca: fs.readFileSync(path.join(process.cwd(), 'packages/experimental/bots/config/protonmail-cert.pem'))
    }
  };

  test('IMAP', async () => {
    // https://www.npmjs.com/package/imap-simple
    const connection = await imaps.connect({ imap: config });
    await connection.openBox('INBOX');

    // TODO(burdon): Poll and parse email.
    // TODO(burdon): Generate contact list.

    const messages = await connection.search(['UNSEEN'], {
      bodies: ['HEADER', 'TEXT'],
      markSeen: false
    });

    const subjects = messages.map((res) => res.parts.filter((part) => part.which === 'HEADER')[0].body.subject[0]);
    console.log(JSON.stringify(subjects.slice(0, 10), undefined, 2));
  });
});
