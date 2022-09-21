//
// Copyright 2022 DXOS.org
//

import { Event, Trigger } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { ErrorStream } from '@dxos/debug';
import { PublicKey, schema } from '@dxos/protocols';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { ConnectionState, WebRTCEvent, WebRTCService } from '@dxos/protocols/proto/dxos/mesh/webrtc';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';

import { SignalMessage } from '../signal';
import { Transport } from './transport';

interface Services {
  WebRTCService: WebRTCService
}

export interface WebRTCTransportProxyParams {
  initiator: boolean
  stream: NodeJS.ReadWriteStream
  ownId: PublicKey
  remoteId: PublicKey
  sessionId: PublicKey
  topic: PublicKey
  sendSignal: (msg: SignalMessage) => void
  port: RpcPort
}

export class WebRTCTransportProxy implements Transport {
  readonly closed = new Event();
  readonly connected = new Event();
  readonly errors = new ErrorStream();

  private readonly _rpc: ProtoRpcPeer<Services>;
  private readonly _openedRpc = new Trigger();
  private _serviceStream!: Stream<WebRTCEvent>;

  constructor (private readonly _params: WebRTCTransportProxyParams) {
    this._rpc = createProtoRpcPeer({
      requested: {
        WebRTCService: schema.getService('dxos.mesh.webrtc.WebRTCService')
      },
      exposed: {},
      handlers: {},
      noHandshake: true,
      port: this._params.port,
      encodingOptions: {
        preserveAny: true
      }
    });
  }

  async init(): Promise<void> {
    await this._rpc.open();
    this._openedRpc.wake();

    this._serviceStream = this._rpc.rpc.WebRTCService.open({ initiator: this._params.initiator });
    this._serviceStream.subscribe(async (msg: WebRTCEvent) => {
      if (msg.connection) {
        await this._handleConnection(msg.connection);
      } else if (msg.data) {
        this._handleData(msg.data);
      } else if (msg.signal) {
        await this._handleSignal(msg.signal);
      }
    });
  }

  private async _handleConnection (connectionEvent: WebRTCEvent.ConnectionEvent): Promise<void> {
    if (connectionEvent.error) {
      this.errors.raise(new Error(connectionEvent.error));
    }

    switch (connectionEvent.state) {
      case ConnectionState.CONNECTED: {
        // TODO(mykola): pipe serviceStream into this._params.stream
        this.connected.emit();
        break;
      }
      case ConnectionState.CLOSED: {
        await this.close();
        break;
      }
    }

  }

  private _handleData (dataEvent: WebRTCEvent.DataEvent) {
    throw new Error('Not implemented');
  }

  private async _handleSignal (signalEvent: WebRTCEvent.SignalEvent) {
    await this._params.sendSignal({
      author: this._params.ownId,
      recipient: this._params.remoteId,
      topic: this._params.topic,
      sessionId: this._params.sessionId,
      data: { signal: signalEvent.payload }
    });
  }

  async signal (signal: Signal): Promise<void> {
    await this._openedRpc.wait();
    await this._rpc.rpc.WebRTCService.sendSignal({ signal });
  }

  async close (): Promise<void> {
    this._serviceStream.close();
    await this._rpc.rpc.WebRTCService.close({});
    this._rpc.close();
  }
}
