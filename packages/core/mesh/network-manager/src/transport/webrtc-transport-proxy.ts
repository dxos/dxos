//
// Copyright 2022 DXOS.org
//

import { Event, Trigger } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { ErrorStream } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { schema } from '@dxos/protocols';
import { ConnectionState, BridgeEvent, BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';

import { SignalMessage } from '../signal';
import { Transport, TransportFactory, TransportOptions } from './transport';

interface Services {
  BridgeService: BridgeService
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
  private _closed = false;
  readonly connected = new Event();
  readonly errors = new ErrorStream();

  private readonly _rpc: ProtoRpcPeer<Services>;
  private readonly _openedRpc = new Trigger();
  private _serviceStream!: Stream<BridgeEvent>;

  constructor (private readonly _params: WebRTCTransportProxyParams) {
    this._rpc = createProtoRpcPeer({
      requested: {
        BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
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

  async init (): Promise<void> {
    await this._rpc.open();
    this._openedRpc.wake();

    this._serviceStream = this._rpc.rpc.BridgeService.open({ sessionId: this._params.sessionId, initiator: this._params.initiator });
    await this._serviceStream.waitUntilReady();
    this._serviceStream.subscribe(async (msg: BridgeEvent) => {
      if (msg.connection) {
        await this._handleConnection(msg.connection);
      } else if (msg.data) {
        this._handleData(msg.data);
      } else if (msg.signal) {
        await this._handleSignal(msg.signal);
      }
    });

    this._params.stream.on('data', async (data: Uint8Array) => this._rpc.rpc.BridgeService.sendData({ sessionId: this._params.sessionId, payload: data }));
  }

  private async _handleConnection (connectionEvent: BridgeEvent.ConnectionEvent): Promise<void> {
    if (connectionEvent.error) {
      this.errors.raise(new Error(connectionEvent.error));
    }

    switch (connectionEvent.state) {
      case ConnectionState.CONNECTED: {
        this.connected.emit();
        break;
      }
      case ConnectionState.CLOSED: {
        await this.close();
        break;
      }
    }
  }

  private _handleData (dataEvent: BridgeEvent.DataEvent) {
    this._params.stream.write(dataEvent.payload);
  }

  private async _handleSignal (signalEvent: BridgeEvent.SignalEvent) {
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
    await this._rpc.rpc.BridgeService.sendSignal({ sessionId: this._params.sessionId, signal });
  }

  async close (): Promise<void> {
    if (this._closed) {
      return;
    }
    this._serviceStream.close();
    await this._rpc.rpc.BridgeService.close({ sessionId: this._params.sessionId });
    this._rpc.close();
    this.closed.emit();
    this._closed = true;
  }
}

export const createWebRTCTransportProxyFactory = ({ port }: { port: RpcPort }): TransportFactory => {
  return (params: TransportOptions) => new WebRTCTransportProxy({
    port,
    ...params
  });
};
