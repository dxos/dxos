//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import Signal from 'signal-promise';

import { ERR_PROTOCOL_INIT_INVALID } from './errors';
import { Extension } from './extension';
import { Buffer as ProtoBuffer } from './proto/gen/dxos/protocol';

export interface ExtensionInitOptions {
  timeout?: number
}

export class ExtensionInit extends Extension {
  private _timeout?: number;
  /**
   * Whether the remote peer has finished initialization.
   */
  private _remoteInit: boolean | null = null;
  private _remoteSignal: any;
  public data: any;

  constructor (options: ExtensionInitOptions = {}) {
    super('dxos.protocol.init', options);

    this._timeout = options.timeout;
    this._remoteInit = null;
    this._remoteSignal = new Signal();

    this.setMessageHandler(async (protocol, message: ProtoBuffer) => {
      const { data } = message;
      assert(data);

      console.log({ hanshakeMessage: data });

      if (Buffer.from(data).toString() === 'continue') {
        this._remoteInit = true;
      } else {
        // break
        this._remoteInit = false;
      }

      this._remoteSignal.notify();
    });

    this.setCloseHandler(async () => {
      this._remoteInit = false;
      this._remoteSignal.notify();
    });
  }

  async continue () {
    try {
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
      console.error(err);
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
