//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { ErrorStream } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ConnectionState, BridgeEvent, BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { SignalMessage } from '../signal';
import { Transport, TransportFactory, TransportOptions } from './transport';

export interface WebRTCTransportProxyParams {
  initiator: boolean
  stream: NodeJS.ReadWriteStream
  ownId: PublicKey
  remoteId: PublicKey
  sessionId: PublicKey
  topic: PublicKey
  sendSignal: (msg: SignalMessage) => void
  bridgeService: BridgeService
}

export class WebRTCTransportProxy implements Transport {
  readonly closed = new Event();
  private _closed = false;
  readonly connected = new Event();
  readonly errors = new ErrorStream();

  private _serviceStream!: Stream<BridgeEvent>;
  private readonly _proxyId = PublicKey.random();

  constructor (private readonly _params: WebRTCTransportProxyParams) {
    this._serviceStream = this._params.bridgeService.open({ proxyId: this._proxyId, initiator: this._params.initiator });

    this._serviceStream.waitUntilReady().then(
      () => {
        this._serviceStream.subscribe(async (msg: BridgeEvent) => {
          if (msg.connection) {
            await this._handleConnection(msg.connection);
          } else if (msg.data) {
            this._handleData(msg.data);
          } else if (msg.signal) {
            await this._handleSignal(msg.signal);
          }
        });

        this._params.stream.on('data', async (data: Uint8Array) => this._params.bridgeService.sendData({ proxyId: this._proxyId, payload: data }));
      },
      (error) => log.catch(error)
    );
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
    await this._params.bridgeService.sendSignal({ proxyId: this._proxyId, signal });
  }

  async close (): Promise<void> {
    if (this._closed) {
      return;
    }
    this._serviceStream.close();
    await this._params.bridgeService.close({ proxyId: this._proxyId });
    this.closed.emit();
    this._closed = true;
  }
}

export const createWebRTCTransportProxyFactory = ({ bridgeService }: { bridgeService: BridgeService }): TransportFactory => {
  return (params: TransportOptions) => new WebRTCTransportProxy({
    bridgeService,
    ...params
  });
};
