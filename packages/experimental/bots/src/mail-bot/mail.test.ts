//
// Copyright 2023 DXOS.org
//

import Imap from 'imap';
import imaps from 'imap-simple';
import { inspect } from 'util';

import { describe, test } from '@dxos/test';

// NOTE: Configure bridge settings: SSL.
// TODO(burdon): Error self signed certificate. [2023-03-02 sent support ticket].

// Protonmail bridge as alternative to Gmail, which requires a registered Google workspace.
// Runs local IMAP server.
// https://proton.me/blog/bridge-security-model

describe('Mail', () => {
  const config = {
    user: process.env.PROTONMAIL_USERNAME!,
    password: process.env.PROTONMAIL_PASSWORD!,
    host: '127.0.0.1',
    port: 1143,
    tls: true
  };

  console.log('Config:', JSON.stringify(config, undefined, 2));

  // https://www.npmjs.com/package/imap-simple
  test.skip('IMAP simple', () => {
    imaps.connect({ imap: config }).then((connection) =>
      connection.openBox('INBOX').then(() => {
        const searchCriteria = ['UNSEEN'];

        const fetchOptions = {
          bodies: ['HEADER', 'TEXT'],
          markSeen: false
        };

        return connection.search(searchCriteria, fetchOptions).then((results) => {
          const subjects = results.map((res) => res.parts.filter((part) => part.which === 'HEADER')[0].body.subject[0]);
          console.log(subjects);
          // =>
          //   [ 'Hey Chad, long time no see!',
          //     'Your amazon.com monthly statement',
          //     'Hacker Newsletter Issue #445' ]
        });
      })
    );
  });

  // https://www.npmjs.com/package/imap
  test('IMAP', () => {
    const imap = new Imap(config);

    const openInbox = (cb) => {
      imap.openBox('INBOX', true, cb);
    };

    imap.once('ready', () => {
      openInbox((err, box) => {
        if (err) {
          throw err;
        }

        const f = imap.seq.fetch('1:3', {
          bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
          struct: true
        });

        f.on('message', (msg, seqno) => {
          console.log('Message #%d', seqno);
          const prefix = '(#' + seqno + ') ';
          msg.on('body', (stream, info) => {
            let buffer = '';
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
            stream.once('end', () => {
              console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
            });
          });
          msg.once('attributes', (attrs) => {
            console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
          });
          msg.once('end', () => {
            console.log(prefix + 'Finished');
          });
        });

        f.once('error', (err) => {
          console.log('Fetch error: ' + err);
        });

        f.once('end', () => {
          console.log('Done fetching all messages!');
          imap.end();
        });
      });
    });

    imap.once('error', (err: any) => {
      console.log('ERROR:', err);
    });

    imap.once('end', () => {
      console.log('Connection ended');
    });

    imap.connect();
  });
});
