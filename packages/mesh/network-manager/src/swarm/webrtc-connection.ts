//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import SimplePeerConstructor, { Instance as SimplePeer } from 'simple-peer';
import wrtc from 'wrtc';

import { PublicKey } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';
import { ErrorStream, Event } from '@dxos/util';

import { SignalApi } from '../signal';
import { Connection, ConnectionState, ConnectionFactory } from './connection';

const log = debug('dxos:network-manager:swarm:connection');

/**
 * Wrapper around simple-peer. Tracks peer state.
 */
export class WebrtcConnection implements Connection {
  private _state: ConnectionState = ConnectionState.INITIAL;
  private _peer?: SimplePeer;
  private _bufferedSignals: SignalApi.SignalMessage[] = [];

  readonly stateChanged = new Event<ConnectionState>();

  readonly closed = new Event();

  readonly errors = new ErrorStream();

  constructor (
    private readonly _initiator: boolean,
    private readonly _protocol: Protocol,
    private readonly _ownId: PublicKey,
    private readonly _remoteId: PublicKey,
    private readonly _sessionId: PublicKey,
    private readonly _topic: PublicKey,
    private readonly _sendSignal: (msg: SignalApi.SignalMessage) => Promise<void>,
    private readonly _webrtcConfig?: any
  ) {
    log(`Created WebRTC connection ${this._ownId} -> ${this._remoteId} initiator=${this._initiator}`);
  }

  get remoteId () {
    return this._remoteId;
  }

  get sessionId () {
    return this._sessionId;
  }

  get state () {
    return this._state;
  }

  get peer () {
    return this._peer;
  }

  connect () {
    assert(this._state === ConnectionState.INITIAL, 'Invalid state.');

    this._state = this._initiator ? ConnectionState.INITIATING_CONNECTION : ConnectionState.WAITING_FOR_CONNECTION;
    this.stateChanged.emit(this._state);
    log(`Creating webrtc connection topic=${this._topic} ownId=${this._ownId} remoteId=${this._remoteId} initiator=${this._initiator} webrtcConfig=${JSON.stringify(this._webrtcConfig)}`);
    this._peer = new SimplePeerConstructor({
      initiator: this._initiator,
      wrtc: SimplePeerConstructor.WEBRTC_SUPPORT ? undefined : wrtc,
      config: this._webrtcConfig
    });
    this._peer.on('signal', async data => {
      try {
        await this._sendSignal({
          id: this._ownId,
          remoteId: this._remoteId,
          sessionId: this._sessionId,
          topic: this._topic,
          data
        });
      } catch (err) {
        this.errors.raise(err);
      }
    });
    this._peer.on('connect', () => {
      log(`Connection established ${this._ownId} -> ${this._remoteId}`);
      this._state = ConnectionState.CONNECTED;
      this.stateChanged.emit(this._state);

      const stream = this._protocol.stream as NodeJS.ReadWriteStream;
      stream.pipe(this._peer!).pipe(stream);
    });
    this._peer.on('error', err => this.errors.raise(err));
    this._peer.on('close', () => {
      log(`Connection closed ${this._ownId} -> ${this._remoteId}`);
      this._state = ConnectionState.CLOSED;
      this.stateChanged.emit(this._state);
      this._closeStream();
      this.closed.emit();
    });

    for (const signal of this._bufferedSignals) {
      this._peer.signal(signal.data);
    }
  }

  signal (msg: SignalApi.SignalMessage) {
    if (!msg.sessionId.equals(this._sessionId)) {
      log('Dropping signal for incorrect session id.');
      return;
    }
    if (msg.data.type === 'offer' && this._state === ConnectionState.INITIATING_CONNECTION) {
      throw new Error('Invalid state: Cannot send offer to an initiating peer.');
    }
    assert(msg.id.equals(this._remoteId));
    assert(msg.remoteId.equals(this._ownId));

    if (this._state === ConnectionState.INITIAL) {
      log(`${this._ownId} buffered signal from ${this._remoteId}: ${msg.data.type}`);
      this._bufferedSignals.push(msg);
      return;
    }

    assert(this._peer, 'Connection not ready to accept signals.');
    log(`${this._ownId} received signal from ${this._remoteId}: ${msg.data.type}`);
    this._peer.signal(msg.data);
  }

  async close () {
    this._state = ConnectionState.CLOSED;
    this.stateChanged.emit(this._state);
    if (!this._peer) {
      return;
    }
    await this._closeStream();
    await new Promise(resolve => {
      this._peer!.once('close', resolve);
      this._peer!.destroy();
    });
    this.closed.emit();
  }

  private async _closeStream () {
    await (this._protocol as any).close();

    const stream = this._protocol.stream as NodeJS.ReadWriteStream;
    stream.unpipe(this._peer).unpipe(stream);
  }
}

export function createWebRtcConnectionFactory (webrtcConfig?: any): ConnectionFactory {
  return opts => new WebrtcConnection(
    opts.initiator,
    opts.protocol,
    opts.ownId,
    opts.remoteId,
    opts.sessionId,
    opts.topic,
    opts.sendSignal,
    webrtcConfig
  );
}
