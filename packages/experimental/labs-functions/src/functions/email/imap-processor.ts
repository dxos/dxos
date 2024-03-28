//
// Copyright 2023 DXOS.org
//

import { sub } from 'date-fns/sub';
import { type Config as ImapConfig } from 'imap';
import imaps, { type Message as ImapMessage, type ImapSimple } from 'imap-simple';
import { simpleParser, type EmailAddress } from 'mailparser';
import { promisify } from 'node:util';
import textract from 'textract';

import { Message as MessageType } from '@braneframe/types/proto';
import { TextObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { toArray } from '../../util';

// Protonmail bridge (local IMAP server) as alternative to Gmail, which requires a registered Google workspace.
// https://proton.me/blog/bridge-security-model
// NOTE: Configure bridge settings: SSL; download the cert.

export class ImapProcessor {
  private _connection?: ImapSimple;

  // prettier-ignore
  constructor(
    private readonly _id: string,
    private readonly _config: ImapConfig,
  ) {
    invariant(this._id);
    invariant(this._config);
  }

  // https://www.npmjs.com/package/imap-simple
  async connect() {
    if (!this._connection) {
      log('connecting...', { config: this._config });
      this._connection = await imaps.connect({ imap: this._config! });
      await this._connection.openBox('INBOX');
      log('connected');
    }
  }

  async disconnect() {
    if (this._connection) {
      log('disconnecting...');
      this._connection.end();
      this._connection = undefined;
      log('disconnected');
    }
  }

  /**
   * Make IMAP request.
   */
  // TODO(burdon): Request since timestamp.
  async requestMessages({ days }: { days: number } = { days: 28 }): Promise<MessageType[]> {
    log('requesting...', { days });

    // https://github.com/mscdex/node-imap
    const messages = await this._connection!.search(['ALL', ['SINCE', sub(Date.now(), { days })]], {
      bodies: [''],
      markSeen: false,
    });

    const parsedMessage = await this.parseMessages(messages);
    log('parsed', { messages: parsedMessage.length });
    return parsedMessage;
  }

  private async parseMessages(rawMessages: ImapMessage[]): Promise<MessageType[]> {
    log('parsing', { messages: rawMessages.length });
    return (
      await Promise.all(
        rawMessages.map(async (raw): Promise<MessageType | undefined> => {
          return this.parseMessage(raw);
        }),
      )
    ).filter(Boolean) as MessageType[];
  }

  /**
   * Parse raw IMAP messages.
   */
  private async parseMessage(rawMessage: ImapMessage): Promise<MessageType | undefined> {
    // https://nodemailer.com/extras/mailparser
    const input: string = rawMessage.parts[0].body;
    const { messageId, date, from, to, cc, subject, text, textAsHtml } = await simpleParser(input);
    if (!messageId || !date || !from || !to || !subject) {
      return;
    }

    const message = new MessageType(
      {
        type: 'email',
        date: date.toISOString(),
        from: toRecipient(from.value[0]),
        to: toArray(to)?.map((to) => toRecipient(to.value[0])),
        cc: toArray(cc)?.map((cc) => toRecipient(cc.value[0])),
        subject,
      },
      {
        meta: { keys: [{ source: this._id, id: messageId }] },
      },
    );

    // Skip bulk mail.
    const ignoreMatchingEmail = [/noreply/, /no-reply/, /notifications/, /billing/, /support/];
    if (!message.from?.email || ignoreMatchingEmail.some((regex) => regex.test(message.from!.email!))) {
      return;
    }

    let body = text ?? '';
    if (!text && textAsHtml) {
      // https://www.npmjs.com/package/textract
      // TODO(burdon): https://www.npmjs.com/package/html-to-text
      body = (await promisify(textract.fromBufferWithMime)('text/html', Buffer.from(textAsHtml))) as string;
    }

    message.blocks = [{ content: new TextObject(body) }];
    return message;
  }
}

// TODO(burdon): Move to utils.

const toRecipient = ({ address: email, name }: EmailAddress): MessageType.Recipient => ({
  email,
  name: name?.length ? name : undefined,
});
