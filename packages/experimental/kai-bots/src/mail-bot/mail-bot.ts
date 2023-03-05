//
// Copyright 2023 DXOS.org
//

import sub from 'date-fns/sub';
import { convert } from 'html-to-text';
import { Config as ImapConfig } from 'imap';
import imaps, { Message as ImapMessage } from 'imap-simple';
import { simpleParser, EmailAddress } from 'mailparser';

import { Message } from '@dxos/kai';
import { log } from '@dxos/log';

import { Bot } from '../bot';
import { getKey } from '../util';

const toArray = (value: any) => (Array.isArray(value) ? value : [value]);

// Protonmail bridge as alternative to Gmail, which requires a registered Google workspace.
// https://proton.me/blog/bridge-security-model
// Runs local IMAP server.
// NOTE: Configure bridge settings: SSL; download the cert.

// TODO(burdon): Object with spam and blacklist arrays.
const blacklist = [/noreply/, /no-reply/, /notifications/, /billing/, /support/];

export type Message = {
  sourceId?: string;
  from?: EmailAddress;
  to?: EmailAddress[];
  date?: string;
  subject?: string;
  body?: string;
};

export class MailBot extends Bot {
  private _imapConfig?: ImapConfig;

  // TODO(burdon): Polling.
  async onStart() {
    const messages = await this.requestMessages();
    log.info('mail bot', { messages: messages.length });
    messages.forEach((message) => {
      void this.space.db.add(new Message());
    });
  }

  async onStop() {}

  override async onInit() {
    // TODO(burdon): Configure via file?
    this._imapConfig = {
      user: process.env.PROTONMAIL_USERNAME!,
      password: process.env.PROTONMAIL_PASSWORD!,
      host: process.env.PROTONMAIL_HOST ?? '127.0.0.1',
      port: process.env.PROTONMAIL_PORT ? parseInt(process.env.PROTONMAIL_PORT) : 1143,
      tls: true,
      tlsOptions: {
        ca: process.env.PROTONMAIL_CERT ?? getKey(this.config, 'protonmail.ca'),
        rejectUnauthorized: false
      }
    };
  }

  /**
   * Make IMAP request.
   */
  async requestMessages({ days }: { days: number } = { days: 28 }): Promise<Message[]> {
    // https://www.npmjs.com/package/imap-simple
    log.info('connecting...', { config: this._imapConfig });
    const connection = await imaps.connect({ imap: this._imapConfig! });
    await connection.openBox('INBOX');
    log.info('connected');

    // https://github.com/mscdex/node-imap
    const rawMessages = await connection.search(['ALL', ['SINCE', sub(Date.now(), { days })]], {
      bodies: [''],
      markSeen: false
    });

    log.info('disconnecting...');
    await connection.end();
    log.info('disconnected');

    return this.parseMessages(rawMessages);
  }

  /**
   * Parse raw IMAP messages.
   */
  // TODO(burdon): Factor out IMAP parser.
  private async parseMessages(rawMessages: ImapMessage[]): Promise<Message[]> {
    const messages = await Promise.all(
      rawMessages.map(async (raw): Promise<Message | undefined> => {
        // https://nodemailer.com/extras/mailparser
        const input: string = raw.parts[0].body;
        const { messageId, date, from, to, subject, text, textAsHtml } = await simpleParser(input);

        const message: Message = {
          sourceId: messageId,
          date: date?.toISOString(),
          from: from?.value[0],
          to: toArray(to).map((to) => to.value),
          subject
        };

        // Skip bulk mail.
        if (!message.from?.address || blacklist.some((regex) => regex.test(message.from!.address!))) {
          return;
        }

        // TODO(burdon): Custom parsing (e.g., remove links, images).
        // https://www.npmjs.com/package/html-to-text
        let body = text;
        if (textAsHtml) {
          let str = convert(textAsHtml, {
            selectors: [
              { selector: 'a', format: 'skip' },
              { selector: 'img', format: 'skip' }
            ]
          });

          // TODO(burdon): Heuristics.
          {
            // TODO(burdon): Remove brackets around removed links/images.
            str = str.replace(/\[\]/g, '');

            // Remove multiple newlines.
            str = str.replace(/\n+/g, '\n');
          }
          {
            // Spam.
            const idx = str.indexOf('unsubscribe');
            if (idx !== -1) {
              return undefined;
            }
          }
          {
            const idx = str.indexOf('---------- Forwarded message ---------');
            if (idx !== -1) {
              str = str.slice(0, idx);
            }
          }

          body = str;
        }

        message.body = body;
        return message;
      })
    );

    const filteredMessages: Message[] = messages.filter(Boolean) as Message[];
    return filteredMessages;
  }
}
