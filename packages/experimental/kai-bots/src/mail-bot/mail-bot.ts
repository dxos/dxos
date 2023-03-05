//
// Copyright 2023 DXOS.org
//

import assert from 'assert';

import { Message } from '@dxos/kai-types';
import { log } from '@dxos/log';

import { Bot } from '../bot';
import { getKey } from '../util';
import { ImapProcessor } from './imap-processor';

// TODO(burdon): Configure.
const POLLING_INTERVAL = 5_000;

export class MailBot extends Bot {
  private _processor?: ImapProcessor;
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
    this._processor = new ImapProcessor({
      user: process.env.PROTONMAIL_USERNAME!,
      password: process.env.PROTONMAIL_PASSWORD!,
      host: process.env.PROTONMAIL_HOST ?? '127.0.0.1',
      port: process.env.PROTONMAIL_PORT ? parseInt(process.env.PROTONMAIL_PORT) : 1143,
      tls: true,
      tlsOptions: {
        ca: process.env.PROTONMAIL_CERT ?? getKey(this.config, 'protonmail.ca'),
        rejectUnauthorized: false
      }
    });
  }

  /**
   * Poll messages and merge into inbox.
   */
  async pollMessages() {
    const { objects: currentMessages } = this.space.db.query(Message.filter());
    const findCurrent = (id: string) => currentMessages.find((message) => message.source.guid === id);

    // TODO(burdon): Deleted messages (e.g., if no longer exists in time range); updated properties.
    assert(this._processor);
    const messages = await this._processor.requestMessages();
    log.info('processed', { current: currentMessages.length, messages: messages.length });
    for (const message of messages) {
      if (!message.source?.guid || !findCurrent(message.source?.guid)) {
        await this.space.db.add(message);
      }
    }
  }
}
