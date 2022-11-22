//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { ErrorStream } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ConnectionState, BridgeEvent, BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { Transport, TransportFactory, TransportOptions } from './transport';

export type WebRTCTransportProxyParams = {
  initiator: boolean;
  stream: NodeJS.ReadWriteStream;
  bridgeService: BridgeService;
  sendSignal: (signal: Signal) => Promise<void>;
};

export class WebRTCTransportProxy implements Transport {
  readonly closed = new Event();
  private _closed = false;
  readonly connected = new Event();

  readonly errors = new ErrorStream();

  private _serviceStream!: Stream<BridgeEvent>;
  private readonly _proxyId = PublicKey.random();

  // prettier-ignore
  constructor(
    private readonly _params: WebRTCTransportProxyParams
  ) {
    this._serviceStream = this._params.bridgeService.open({
      proxyId: this._proxyId,
      initiator: this._params.initiator
    });

    this._serviceStream.waitUntilReady().then(
      () => {
        this._serviceStream.subscribe(async (event: BridgeEvent) => {
          log('WebRTCTransportProxy: event', event);
          if (event.connection) {
            await this._handleConnection(event.connection);
          } else if (event.data) {
            this._handleData(event.data);
          } else if (event.signal) {
            await this._handleSignal(event.signal);
          }
        });

        this._params.stream.on('data', async (data: Uint8Array) => {
          try {
            await this._params.bridgeService.sendData({
              proxyId: this._proxyId,
              payload: data
            });
          } catch (err: any) {
            log.catch(err);
          }
        });
      },
      (error) => log.catch(error)
    );
  }

  private async _handleConnection(connectionEvent: BridgeEvent.ConnectionEvent): Promise<void> {
    if (connectionEvent.error) {
      this.errors.raise(new Error(connectionEvent.error));
    }

    switch (connectionEvent.state) {
      case ConnectionState.CONNECTED: {
        this.connected.emit();
        break;
      }
      case ConnectionState.CLOSED: {
        await this.destroy();
        break;
      }
    }
  }

  private _handleData(dataEvent: BridgeEvent.DataEvent) {
    // NOTE: This must be a Buffer otherwise hypercore-protocol breaks.
    this._params.stream.write(Buffer.from(dataEvent.payload));
  }

  private async _handleSignal(signalEvent: BridgeEvent.SignalEvent) {
    await this._params.sendSignal(signalEvent.payload);
  }

  signal(signal: Signal): void {
    this._params.bridgeService
      .sendSignal({
        proxyId: this._proxyId,
        signal
      })
      .catch((err) => this.errors.raise(err));
  }

  // TODO(burdon): Move open from constructor.
  async destroy(): Promise<void> {
    if (this._closed) {
      return;
    }

    this._serviceStream.close();

    try {
      await this._params.bridgeService.close({ proxyId: this._proxyId });
    } catch (err: any) {
      log.catch(err);
    }

    this.closed.emit();
    this._closed = true;
  }

  /**
   * Called when underlying proxy service becomes unavailable.
   */
  // TODO(burdon): Option on close method.
  forceClose() {
    this._serviceStream.close();
    this.closed.emit();
    this._closed = true;
  }
}

// TODO(burdon): Why is this named Proxy?
export class WebRTCTransportProxyFactory implements TransportFactory {
  private _bridgeService: BridgeService | undefined;
  private _connections = new Set<WebRTCTransportProxy>();

  /**
   * Sets the current BridgeService to be used to open connections.
   * Calling this method will close any existing connections.
   */
  setBridgeService(bridgeService: BridgeService | undefined): this {
    this._bridgeService = bridgeService;
    for (const connection of this._connections) {
      connection.forceClose();
    }

    return this;
  }

  createTransport(options: TransportOptions): Transport {
    assert(this._bridgeService, 'WebRTCTransportProxyFactory is not ready to open connections');

    const transport = new WebRTCTransportProxy({
      ...options,
      bridgeService: this._bridgeService
    });

    this._connections.add(transport);
    transport.closed.on(() => this._connections.delete(transport));

    return transport;
  }
}
