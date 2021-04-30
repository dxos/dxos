//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import SimplePeerConstructor, { Instance as SimplePeer } from 'simple-peer';
import wrtc from 'wrtc';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';

import { SignalApi } from '../signal';
import { Connection, ConnectionState, ConnectionFactory } from './connection';

const log = debug('dxos:network-manager:swarm:connection');

/**
 * Wrapper around simple-peer. Tracks peer state.
 */
export class WebrtcConnection implements Connection {
  private _state: ConnectionState;
  private _peer?: SimplePeer;

  readonly stateChanged = new Event<ConnectionState>();

  readonly closed = new Event();

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
    this._state = ConnectionState.WAITING_FOR_ANSWER;
    log(`Created connection ${this._ownId} -> ${this._remoteId} initiator=${this._initiator}`);
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
        // TODO(marik-d): Error handling.
        console.error(err);
      }
    });
    this._peer.on('connect', () => {
      log(`Connection established ${this._ownId} -> ${this._remoteId}`);
      this._state = ConnectionState.CONNECTED;
      this.stateChanged.emit(this._state);

      const stream = this._protocol.stream as any as NodeJS.ReadWriteStream;
      stream.pipe(this._peer!).pipe(stream);
    });
    this._peer.on('error', err => {
      // TODO(marik-d): Error handling.
      console.error('peer error');
      console.error(err);
    });
    this._peer.on('close', () => {
      log(`Connection closed ${this._ownId} -> ${this._remoteId}`);
      this._state = ConnectionState.CLOSED;
      this.stateChanged.emit(this._state);
      this._closeStream();
      this.closed.emit();
    });
  }

  signal (msg: SignalApi.SignalMessage) {
    assert(this._peer);
    if (!msg.sessionId.equals(this._sessionId)) {
      log('Dropping signal for incorrect session id.');
      return;
    }
    if (msg.data.type === 'offer' && this._state === ConnectionState.INITIATING_CONNECTION) {
      throw new Error('Invalid state: Cannot send offer to an initiating peer.');
    }
    assert(msg.id.equals(this._remoteId));
    assert(msg.remoteId.equals(this._ownId));
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

    const stream = this._protocol.stream as any as NodeJS.ReadWriteStream;
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
