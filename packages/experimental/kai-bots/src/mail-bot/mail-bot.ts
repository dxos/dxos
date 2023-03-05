//
// Copyright 2023 DXOS.org
//

import assert from 'assert';
import sub from 'date-fns/sub';
import { convert } from 'html-to-text';
import { Config as ImapConfig } from 'imap';
import imaps, { Message as ImapMessage } from 'imap-simple';
import { simpleParser, EmailAddress } from 'mailparser';

import { Message } from '@dxos/kai-types';
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

// TODO(burdon): Configure.
const POLLING_INTERVAL = 5_000;

export class MailBot extends Bot {
  private _imapConfig?: ImapConfig;
  private _interval?: ReturnType<typeof setTimeout>;

  async onStart() {
    assert(!this._interval);
    this._interval = setInterval(() => {
      void this.pollMessages();
    }, POLLING_INTERVAL);
  }

  async onStop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
  }

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

    log.info('initialized', { config: this._imapConfig });
  }

  /**
   * Poll messages and merge into inbox.
   */
  async pollMessages() {
    const { objects: currentMessages } = this.space.db.query(Message.filter());
    const findCurrent = (id: string) => currentMessages.find((message) => message.source.guid === id);

    // TODO(burdon): Deleted messages (e.g., if no longer exists in time range); updated properties.
    const messages = await this.requestMessages();
    log.info('processed', { current: currentMessages.length, messages: messages.length });
    for (const message of messages) {
      if (!message.source?.guid || !findCurrent(message.source?.guid)) {
        await this.space.db.add(message);
      }
    }
  }

  /**
   * Make IMAP request.
   */
  async requestMessages({ days }: { days: number } = { days: 28 }): Promise<Message[]> {
    // https://www.npmjs.com/package/imap-simple
    log.info('connecting...');
    const connection = await imaps.connect({ imap: this._imapConfig! });
    await connection.openBox('INBOX');
    log.info('connected');

    // https://github.com/mscdex/node-imap
    const messages = await connection.search(['ALL', ['SINCE', sub(Date.now(), { days })]], {
      bodies: [''],
      markSeen: false
    });

    log.info('received', { messages: messages.length });

    log.info('disconnecting...');
    await connection.end();
    log.info('disconnected');

    return this.parseMessages(messages);
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
        if (!messageId || !date || !from || !to || !subject) {
          return;
        }

        const convertToContact = ({ address: email, name }: EmailAddress): Message.Contact =>
          new Message.Contact({ email, name: name?.length ? name : undefined });

        const message = new Message({
          source: {
            guid: messageId
          },
          date: date.toISOString(),
          from: convertToContact(from.value[0]),
          to: toArray(to).map((to) => convertToContact(to.value[0])),
          subject
        });

        // Skip bulk mail.
        if (!message.from?.email || blacklist.some((regex) => regex.test(message.from!.email!))) {
          return;
        }

        // TODO(burdon): Custom parsing (e.g., remove links, images).
        // https://www.npmjs.com/package/html-to-text
        let body = text ?? '';
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
