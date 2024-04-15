//
// Copyright 2022 DXOS.org
//

import { Writable } from 'node:stream';

import { Event, scheduleTask } from '@dxos/async';
import { type Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { ErrorStream } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  ConnectionResetError,
  TimeoutError,
  ProtocolError,
  ConnectivityError,
  UnknownProtocolError,
} from '@dxos/protocols';
import { ConnectionState, type BridgeEvent, type BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { type Signal } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { arrayToBuffer } from '@dxos/util';

import { type Transport, type TransportFactory, type TransportOptions, type TransportStats } from './transport';

const RPC_TIMEOUT = 10_000;
const RESP_MIN_THRESHOLD = 500;
const TIMEOUT_THRESHOLD = 10;

export type SimplePeerTransportProxyOptions = TransportOptions & {
  bridgeService: BridgeService;
};

export class SimplePeerTransportProxy implements Transport {
  private readonly _proxyId = PublicKey.random();
  private readonly _ctx = new Context();
  private _timeoutCount = 0;

  readonly closed = new Event();
  readonly connected = new Event();
  readonly errors = new ErrorStream();

  private _closed = false;
  private _serviceStream!: Stream<BridgeEvent>;

  constructor(private readonly _options: SimplePeerTransportProxyOptions) {}

  get isOpen() {
    // TODO(burdon): Open state?
    return !this._closed;
  }

  async open() {
    this._serviceStream = this._options.bridgeService.open(
      {
        proxyId: this._proxyId,
        initiator: this._options.initiator,
      },
      { timeout: RPC_TIMEOUT },
    );

    this._serviceStream.waitUntilReady().then(
      () => {
        this._serviceStream.subscribe(async (event: BridgeEvent) => {
          log('SimplePeerTransportProxy: event', event);
          if (event.connection) {
            await this._handleConnection(event.connection);
          } else if (event.data) {
            this._handleData(event.data);
          } else if (event.signal) {
            await this._handleSignal(event.signal);
          }
        });

        const proxyStream = new Writable({
          write: (chunk, _, callback) => {
            const then = performance.now();
            this._options.bridgeService
              .sendData(
                {
                  proxyId: this._proxyId,
                  payload: chunk,
                },
                { timeout: RPC_TIMEOUT },
              )
              .then(
                () => {
                  if (performance.now() - then > RESP_MIN_THRESHOLD) {
                    log('slow response, delaying callback');
                    scheduleTask(this._ctx, () => callback(), RESP_MIN_THRESHOLD);
                  } else {
                    callback();
                  }
                  this._timeoutCount = 0;
                },
                (err: any) => {
                  if (err instanceof TimeoutError || err.constructor.name === 'TimeoutError') {
                    if (this._timeoutCount++ > TIMEOUT_THRESHOLD) {
                      throw new TimeoutError(`too many timeouts (${this._timeoutCount} > ${TIMEOUT_THRESHOLD}`);
                    } else {
                      log('timeout error, but still invoking callback');
                      callback();
                    }
                  } else {
                    log.catch(err);
                  }
                },
              );
          },
        });

        proxyStream.on('error', (err) => {
          log('proxystream error', { err });
        });

        this._options.stream.pipe(proxyStream);
      },
      (error) => log.catch(error),
    );
  }

  async close() {
    await this._ctx.dispose();
    if (this._closed) {
      return;
    }

    await this._serviceStream.close();

    try {
      await this._options.bridgeService.close({ proxyId: this._proxyId }, { timeout: RPC_TIMEOUT });
    } catch (err: any) {
      log.catch(err);
    }

    this.closed.emit();
    this._closed = true;
  }

  async onSignal(signal: Signal) {
    this._options.bridgeService
      .sendSignal(
        {
          proxyId: this._proxyId,
          signal,
        },
        { timeout: RPC_TIMEOUT },
      )
      .catch((err) => this.errors.raise(decodeError(err)));
  }

  private async _handleConnection(connectionEvent: BridgeEvent.ConnectionEvent): Promise<void> {
    if (connectionEvent.error) {
      this.errors.raise(decodeError(connectionEvent.error));
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

  private _handleData(dataEvent: BridgeEvent.DataEvent) {
    // NOTE: This must be a Buffer otherwise hypercore-protocol breaks.
    this._options.stream.write(arrayToBuffer(dataEvent.payload));
  }

  private async _handleSignal(signalEvent: BridgeEvent.SignalEvent) {
    await this._options.sendSignal(signalEvent.payload);
  }

  async getDetails(): Promise<string> {
    return (await this._options.bridgeService.getDetails({ proxyId: this._proxyId }, { timeout: RPC_TIMEOUT })).details;
  }

  async getStats(): Promise<TransportStats> {
    return (await this._options.bridgeService.getStats({ proxyId: this._proxyId }, { timeout: RPC_TIMEOUT }))
      .stats as TransportStats;
  }

  /**
   * Called when underlying proxy service becomes unavailable.
   */
  // TODO(burdon): Option on close method.
  forceClose() {
    void this._serviceStream.close();
    this.closed.emit();
    this._closed = true;
  }
}

// TODO(burdon): Why is this named Proxy?
export class SimplePeerTransportProxyFactory implements TransportFactory {
  private _bridgeService: BridgeService | undefined;
  private _connections = new Set<SimplePeerTransportProxy>();

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
    invariant(this._bridgeService, 'SimplePeerTransportProxyFactory is not ready to open connections');
    const transport = new SimplePeerTransportProxy({
      ...options,
      bridgeService: this._bridgeService,
    });

    this._connections.add(transport);
    transport.closed.on(() => this._connections.delete(transport));
    return transport;
  }
}

// TODO(nf): fix so Errors crossing RPC boundary preserve class
const decodeError = (err: Error | string) => {
  const message = typeof err === 'string' ? err : err.message;
  if (message.includes('CONNECTION_RESET')) {
    return new ConnectionResetError(message);
  } else if (message.includes('TIMEOUT')) {
    return new TimeoutError(message);
  } else if (message.includes('PROTOCOL_ERROR')) {
    return new ProtocolError(message);
  } else if (message.includes('CONNECTIVITY_ERROR')) {
    return new ConnectivityError(message);
  } else if (message.includes('UNKNOWN_PROTOCOL_ERROR')) {
    return new UnknownProtocolError(message);
  } else {
    return typeof err === 'string' ? new Error(err) : err;
  }
};
