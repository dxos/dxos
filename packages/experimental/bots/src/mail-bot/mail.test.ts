//
// Copyright 2023 DXOS.org
//

import fs from 'fs';
// import { convert } from 'html-to-text';
import imaps from 'imap-simple';
import path from 'path';

import { describe, test } from '@dxos/test';

// Protonmail bridge as alternative to Gmail, which requires a registered Google workspace.
// https://proton.me/blog/bridge-security-model
// Runs local IMAP server.
// NOTE: Configure bridge settings: SSL; download the cert.

type Message = {
  from: string;
  subject: string;
  body: string;
};

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

    const raw = await connection.search(['UNSEEN'], {
      bodies: ['HEADER', 'TEXT'],
      markSeen: true
    });

    const messages = raw.map(({ parts }) => {
      return parts.reduce<Message>((result, part) => {
        switch (part.which) {
          case 'HEADER': {
            // TODO(burdon): Get list of headers.
            // TODO(burdon): Content type.
            // TODO(burdon): Parse email headers (e.g., from).
            result.from = part.body.from[0];
            result.subject = part.body.subject[0];
            break;
          }

          case 'TEXT': {
            // TODO(burdon): Able to select plain text?
            // https://www.npmjs.com/package/html-to-text
            // result.body = convert(part.body);
            result.body = part.body.slice(0, 100);
            break;
          }
        }

        return result;
      }, {} as Message);
    });

    console.log(JSON.stringify(messages, undefined, 2));

    await connection.end();
  });
});
