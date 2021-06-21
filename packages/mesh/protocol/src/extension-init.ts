//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import Signal from 'signal-promise';

import { ERR_PROTOCOL_INIT_INVALID } from './errors';
import { Extension } from './extension';
import { Buffer as ProtoBuffer } from './proto/gen/dxos/protocol';

export interface ExtensionInitOptions {
  timeout?: number,
  userSession?: string,
}

export class ExtensionInit extends Extension {
  private _timeout?: number;
  /**
   * Whether the remote peer has finished initialization.
   */
  private _remoteInit: boolean | null = null;
  private _remoteSignal: any;
  public data: any;
  public userSession: string | null = null;
  public remoteUserSession: string | null = null;

  constructor (options: ExtensionInitOptions = {}) {
    super('dxos.protocol.init', options);

    this._timeout = options.timeout;
    this._remoteInit = null;
    this._remoteSignal = new Signal();

    this.setMessageHandler(async (protocol, message: ProtoBuffer) => {
      const { data } = message;
      assert(data);

      const dataString = Buffer.from(data).toString();
      if (dataString === 'continue') {
        this._remoteInit = true;
      } else if (dataString === 'break') {
        this._remoteInit = false;
      } else {
        this.remoteUserSession = dataString;
      }

      this._remoteSignal.notify();
    });

    this.setCloseHandler(async () => {
      this._remoteInit = false;
      this._remoteSignal.notify();
    });
  }

  async continue (userSession?: string) {
    assert(userSession !== 'continue' && userSession !== 'break', `Cannot use reserved word ${userSession} for session.`);
    try {
      if (userSession) {
        this.userSession = userSession;
        await this.send(Buffer.from(userSession));
      }
      await this.send(Buffer.from('continue'));

      if (this._remoteInit !== null) {
        if (this._remoteInit) {
          return;
        } else {
          throw new Error('Connection closed during handshake.');
        }
      }

      await this._remoteSignal.wait(this._timeout);

      if (!this._remoteInit) {
        throw new Error('Connection closed during handshake.');
      }
    } catch (err) {
      throw new ERR_PROTOCOL_INIT_INVALID(err.message);
    }
  }

  async break () {
    try {
      if (this._remoteInit === false) {
        return;
      }

      await this.send(Buffer.from('break'));
    } catch (err) {}
  }
}
