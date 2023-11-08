//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { Message } from '@dxos/kai-types';
import { log } from '@dxos/log';

import { ImapProcessor } from './imap-processor';
import { Bot } from '../bot';

// TODO(burdon): Configure.
const POLLING_INTERVAL = 10_000;

// TODO(burdon): Factor out.
// TODO(burdon): Propagate error.
// TODO(burdon): Back-off if return false (see debounce).
class Poller {
  _timeout?: ReturnType<typeof setTimeout>;

  // prettier-ignore
  constructor(
    private readonly _callback: () => Promise<void>,
    private readonly _interval: number,
  ) {}

  async start() {
    await this.stop();

    const run = async () => {
      this._timeout = undefined;
      try {
        log.info('running...');
        await this._callback();
      } catch (err) {
        log.catch(err);
        await this.stop();
        return;
      }

      log.info('sleeping...', { delay: this._interval });
      this._timeout = setTimeout(run, this._interval);
    };

    void run();
  }

  async stop() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = undefined;
    }
  }
}

export class MailBot extends Bot {
  private _processor?: ImapProcessor;
  private readonly _poller = new Poller(async () => {
    await this.syncMessages();
  }, POLLING_INTERVAL);

  override async onInit() {
    // Test with curl: `curl -k -v imaps://USERNAME:PASSWORD@127.0.0.1:1143/INBOX?NEW` (Use `urlencode` to encode the username).
    this._processor = new ImapProcessor(this.id, {
      user: process.env.COM_PROTONMAIL_USERNAME!,
      password: process.env.COM_PROTONMAIL_PASSWORD!,
      host: process.env.COM_PROTONMAIL_HOST ?? '127.0.0.1',
      port: process.env.COM_PROTONMAIL_PORT ? parseInt(process.env.COM_PROTONMAIL_PORT) : 1143,
      tls: process.env.COM_PROTONMAIL_TLS ? process.env.COM_PROTONMAIL_TLS === 'true' : true,
      tlsOptions: {
        // ca: process.env.COM_PROTONMAIL_CERT ?? getKey(this.config, 'com.protonmail.ca'),
        rejectUnauthorized: false,
      },
    });
  }

  async onStart() {
    await this.onStop();
    await this._processor?.connect();
    await this._poller.start();
  }

  async onStop() {
    await this._poller.stop();
    await this._processor?.disconnect();
  }

  /**
   * Poll messages and merge into inbox.
   */
  async syncMessages(): Promise<number> {
    const { objects: currentMessages } = this.space.db.query(Message.filter());
    const findCurrent = (id: string) => currentMessages.find((message) => message.source.guid === id);

    // TODO(burdon): Deleted messages (e.g., if no longer exists in time range); updated properties.
    invariant(this._processor);
    const messages = await this._processor.requestMessages();
    log.info('messages', { current: currentMessages.length, messages: messages.length });

    // TODO(burdon): Annotate source of message (in GUID?)
    for (const message of messages) {
      // TODO(burdon): Check resolver id.
      if (!message.source?.guid || !findCurrent(message.source?.guid)) {
        await this.space.db.add(message);
      }
    }

    return messages.length;
  }
}
