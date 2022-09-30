//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';
import Signal from 'signal-promise';

import { Trigger } from '@dxos/async';
import { Buffer as ProtoBuffer } from '@dxos/protocols/proto/dxos/mesh/protocol';

import { ERR_PROTOCOL_INIT_INVALID } from './errors';
import { Extension } from './extension';

type Command = 'continue' | 'break' | 'session'

export interface ExtensionInitOptions {
  timeout?: number
  userSession?: Record<string, any>
}

export class ExtensionInit extends Extension {
  private _timeout?: number;
  /**
   * Whether the remote peer has finished initialization.
   */
  private _remoteInit: boolean | null = null;
  private _remoteSignal: any;
  public data: any;
  public userSession: Record<string, any> | null = null;
  public remoteUserSession: Record<string, any> | null = null;

  private readonly _sessionTrigger = new Trigger();

  constructor (options: ExtensionInitOptions = {}) {
    super('dxos.mesh.protocol.init', options);

    this._timeout = options.timeout;
    this._remoteInit = null;
    this._remoteSignal = new Signal();

    this.setMessageHandler(async (protocol, message: ProtoBuffer) => {
      const { data } = message;
      assert(data);

      const messageObj = JSON.parse(Buffer.from(data).toString());

      switch (messageObj.command as Command) {
        case 'continue':
          this._remoteInit = true;
          this._remoteSignal.notify();
          break;
        case 'break':
          this._remoteInit = false;
          this._remoteSignal.notify();
          break;
        case 'session':
          this.remoteUserSession = messageObj.data;
          this._sessionTrigger.wake();
      }
    });

    this.setCloseHandler(async () => {
      this._remoteInit = false;
      this._remoteSignal.notify();
    });
  }

  async sendCommand (command: Command, data?: Record<string, any>) {
    if (data?.peerId) {
      assert(['undefined', 'string'].includes(typeof data.peerId), 'PeerId must be a string.');
    }
    return this.send(Buffer.from(JSON.stringify({ command, data })));
  }

  async sendSession (userSession?: Record<string, any>) {
    // TODO(rzadp): Protobuf.
    void this.sendCommand('session', userSession).catch(err => {
      this.emit('error', err);
    });

    await this._sessionTrigger.wait();
  }

  async continue () {
    try {
      await this.sendCommand('continue');

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
    } catch (err: any) {
      throw new ERR_PROTOCOL_INIT_INVALID(err.message);
    }
  }

  async break () {
    try {
      if (this._remoteInit === false) {
        return;
      }

      await this.sendCommand('break');
    } catch (err: any) {}
  }
}
