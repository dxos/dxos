//
// Copyright 2022 DXOS.org
//

import { Writable } from 'node:stream';

import { Event, scheduleTask } from '@dxos/async';
import { type Stream } from '@dxos/codec-protobuf/stream';
import { Resource } from '@dxos/context';
import { ErrorStream } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ConnectionResetError, ConnectivityError, TimeoutError } from '@dxos/protocols';
import { type BridgeEvent, type BridgeService, ConnectionState } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { type Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { arrayToBuffer } from '@dxos/util';

import { type Transport, type TransportFactory, type TransportOptions, type TransportStats } from '../transport';

const RPC_TIMEOUT = 10_000;
const CLOSE_RPC_TIMEOUT = 3000;
const RESP_MIN_THRESHOLD = 500;

export type RtcTransportProxyOptions = TransportOptions & {
  bridgeService: BridgeService;
};

export class RtcTransportProxy extends Resource implements Transport {
  private readonly _proxyId = PublicKey.random();

  readonly closed = new Event();
  readonly connected = new Event();
  readonly errors = new ErrorStream();

  private _serviceStream: Stream<BridgeEvent> | undefined;

  constructor(private readonly _options: RtcTransportProxyOptions) {
    super();
  }

  protected override async _open(): Promise<void> {
    let stream: Stream<BridgeEvent>;
    try {
      stream = this._options.bridgeService.open(
        {
          proxyId: this._proxyId,
          remotePeerKey: this._options.remotePeerKey,
          ownPeerKey: this._options.ownPeerKey,
          topic: this._options.topic,
          initiator: this._options.initiator ?? false,
        },
        { timeout: RPC_TIMEOUT },
      );
    } catch (error: any) {
      this.errors.raise(error);
      return;
    }

    this._serviceStream = stream;

    stream.waitUntilReady().then(
      () => {
        stream.subscribe(
          async (event: BridgeEvent) => {
            log('rtc transport proxy event', event);
            if (event.connection) {
              await this._handleConnection(event.connection);
            } else if (event.data) {
              this._handleData(event.data);
            } else if (event.signal) {
              await this._handleSignal(event.signal);
            }
          },
          (err) => {
            log('rtc bridge stream closed', { err });
            if (err) {
              this._raiseIfOpen(err);
            } else {
              void this.close();
            }
          },
        );

        const connectorStream = new Writable({
          write: (chunk, _, callback) => {
            const sendStartMs = Date.now();
            this._options.bridgeService
              .sendData({ proxyId: this._proxyId, payload: chunk }, { timeout: RPC_TIMEOUT })
              .then(
                () => {
                  if (Date.now() - sendStartMs > RESP_MIN_THRESHOLD) {
                    log('slow response, delaying callback');
                    scheduleTask(this._ctx, () => callback(), RESP_MIN_THRESHOLD);
                  } else {
                    callback();
                  }
                },
                (err: any) => {
                  callback();
                  this._raiseIfOpen(err);
                },
              );
          },
        });

        connectorStream.on('error', (err) => {
          this._raiseIfOpen(err);
        });

        this._options.stream.pipe(connectorStream);
      },
      (error) => {
        if (error) {
          this._raiseIfOpen(error);
        } else {
          void this.close();
        }
      },
    );
  }

  protected override async _close(): Promise<void> {
    try {
      await this._serviceStream?.close();
      this._serviceStream = undefined;
    } catch (err: any) {
      log.catch(err);
    }

    try {
      await this._options.bridgeService.close({ proxyId: this._proxyId }, { timeout: CLOSE_RPC_TIMEOUT });
    } catch (err: any) {
      log.catch(err);
    }

    this.closed.emit();
  }

  async onSignal(signal: Signal): Promise<void> {
    this._options.bridgeService
      .sendSignal({ proxyId: this._proxyId, signal }, { timeout: RPC_TIMEOUT })
      .catch((err) => this._raiseIfOpen(decodeError(err)));
  }

  private async _handleConnection(connectionEvent: BridgeEvent.ConnectionEvent): Promise<void> {
    if (connectionEvent.error) {
      this.errors.raise(decodeError(connectionEvent.error));
      return;
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

  private _handleData(dataEvent: BridgeEvent.DataEvent): void {
    try {
      // NOTE: This must be a Buffer otherwise hypercore-protocol breaks.
      this._options.stream.write(arrayToBuffer(dataEvent.payload));
    } catch (error: any) {
      this._raiseIfOpen(error);
    }
  }

  private async _handleSignal(signalEvent: BridgeEvent.SignalEvent): Promise<void> {
    try {
      await this._options.sendSignal(signalEvent.payload);
    } catch (error) {
      const type = signalEvent.payload.payload.data?.type;
      if (type === 'offer' || type === 'answer') {
        this._raiseIfOpen(new ConnectivityError({ message: `Session establishment failed: ${type} couldn't be sent.` }));
      }
    }
  }

  async getDetails(): Promise<string> {
    try {
      const response = await this._options.bridgeService.getDetails(
        { proxyId: this._proxyId },
        { timeout: RPC_TIMEOUT },
      );
      return response.details;
    } catch (err) {
      return 'bridge-svc unreachable';
    }
  }

  async getStats(): Promise<TransportStats> {
    try {
      const response = await this._options.bridgeService.getStats({ proxyId: this._proxyId }, { timeout: RPC_TIMEOUT });
      return response.stats as TransportStats;
    } catch (err) {
      return {
        bytesSent: 0,
        bytesReceived: 0,
        packetsSent: 0,
        packetsReceived: 0,
        rawStats: 'bridge-svc unreachable',
      };
    }
  }

  private _raiseIfOpen(error: any): void {
    if (this.isOpen) {
      this.errors.raise(error);
    } else {
      log.info('error swallowed because transport was closed', { message: error.message });
    }
  }

  /**
   * Called when underlying proxy service becomes unavailable.
   */
  forceClose(): void {
    void this._serviceStream?.close();
    this.closed.emit();
  }
}

export class RtcTransportProxyFactory implements TransportFactory {
  private _bridgeService: BridgeService | undefined;
  private _connections = new Set<RtcTransportProxy>();

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
    invariant(this._bridgeService, 'RtcTransportProxyFactory is not ready to open connections');
    const transport = new RtcTransportProxy({ ...options, bridgeService: this._bridgeService });
    this._connections.add(transport);
    transport.closed.on(() => {
      this._connections.delete(transport);
    });
    return transport;
  }
}

const decodeError = (err: Error | string) => {
  const message = typeof err === 'string' ? err : err.message;
  if (message.includes('CONNECTION_RESET')) {
    return new ConnectionResetError({ message });
  } else if (message.includes('TIMEOUT')) {
    return new TimeoutError({ message });
  } else if (message.includes('CONNECTIVITY_ERROR')) {
    return new ConnectivityError({ message });
  } else {
    return typeof err === 'string' ? new Error(err) : err;
  }
};
