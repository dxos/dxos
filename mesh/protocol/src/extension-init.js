//
// Copyright 2020 DXOS.org
//

import Signal from 'signal-promise';

import { ERR_PROTOCOL_INIT_INVALID } from './errors';
import { Extension } from './extension';

export class ExtensionInit extends Extension {
  constructor (options = {}) {
    super('dxos.protocol.init', options);

    this._timeout = options.timeout;
    this._remoteInit = null;
    this._remoteSignal = new Signal();

    this.setMessageHandler((protocol, message) => {
      const { data } = message;

      if (data.toString() === 'continue') {
        this._remoteInit = true;
        this._remoteSignal.notify();
        return;
      }

      // break
      this._remoteInit = false;
      this._remoteSignal.notify();
    });

    this.setCloseHandler(() => {
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
        }
        throw new Error('remoteInit false');
      }

      await this._remoteSignal.wait(this._timeout);

      if (this._remoteInit) {
        return;
      }
      throw new Error('remoteInit false');
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
