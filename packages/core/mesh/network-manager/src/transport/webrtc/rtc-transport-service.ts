//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { type Empty, EmptySchema } from '@bufbuild/protobuf/wkt';
import { Duplex } from 'node:stream';

import { Stream, Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { requirePublicKey } from '@dxos/protocols/buf';
import { type BufService } from '@dxos/protocols/buf-service';
import {
  type BridgeEvent,
  BridgeEvent_ConnectionEventSchema,
  BridgeEvent_DataEventSchema,
  BridgeEvent_SignalEventSchema,
  BridgeEventSchema,
  BridgeService as BridgeServiceDesc,
  type CloseRequest,
  type ConnectionRequest,
  ConnectionState,
  type DataRequest,
  type DetailsRequest,
  type DetailsResponse,
  DetailsResponseSchema,
  type SignalRequest,
  type StatsRequest,
  type StatsResponse,
  StatsResponseSchema,
} from '@dxos/protocols/buf/dxos/mesh/bridge_pb';
import { ComplexMap } from '@dxos/util';

import { type IceProvider } from '../../signal/index.ts';
import { type Transport, TRANSPORT_CONNECTION_TIMEOUT, type TransportFactory } from '../transport.ts';
import { createRtcTransportFactory } from './rtc-transport-factory.ts';

type BridgeService = BufService<typeof BridgeServiceDesc>;

type TransportState = {
  proxyId: PublicKey;
  transport: Transport;
  connectorStream: Duplex;
  writeProcessedCallbacks: (() => void)[];
};

/** Bounds {@link RtcTransportService._closedTransports}; a proxy stops writing long before this. */
const CLOSED_TRANSPORT_HISTORY = 128;

/** Must expire before the deadline the proxy puts on the call that is waiting. */
const OPEN_REGISTRATION_TIMEOUT = TRANSPORT_CONNECTION_TIMEOUT - 1_000;

export class RtcTransportService implements BridgeService {
  private readonly _openTransports = new ComplexMap<PublicKey, TransportState>(PublicKey.hash);
  /** Proxy ids this service has closed, newest last. */
  private readonly _closedTransports: PublicKey[] = [];
  /** Woken when a proxy id's transport is registered; created by whichever side gets there first. */
  private readonly _registrations = new ComplexMap<PublicKey, Trigger>(PublicKey.hash);

  constructor(
    webrtcConfig?: RTCConfiguration,
    iceProvider?: IceProvider,
    private readonly _transportFactory: TransportFactory = createRtcTransportFactory(webrtcConfig, iceProvider),
  ) {}

  public hasOpenTransports(): boolean {
    return this._openTransports.size > 0;
  }

  open(request: ConnectionRequest): Stream<BridgeEvent> {
    const proxyId = requirePublicKey(request.proxyId);
    const existingTransport = this._openTransports.get(proxyId);
    if (existingTransport) {
      log.error('requesting a new transport bridge for an existing proxy');
      void this._safeCloseTransport(existingTransport);
      this._openTransports.delete(proxyId);
    }

    return new Stream<BridgeEvent>((producer) => {
      try {
        return this._produceTransport(proxyId, request, producer);
      } catch (err) {
        // Nothing will ever register, so callers waiting on it must be released.
        this._rememberClosed(proxyId);
        throw err;
      }
    });
  }

  private _produceTransport(
    proxyId: PublicKey,
    request: ConnectionRequest,
    { ready, next, close }: { ready: () => void; next: (value: BridgeEvent) => void; close: (err?: Error) => void },
  ): void {
    const pushNewState = createStateUpdater(next);

    const transportStream: Duplex = new Duplex({
      read: () => {
        const callbacks = [...transportState.writeProcessedCallbacks];
        transportState.writeProcessedCallbacks.length = 0;
        callbacks.forEach((cb) => cb());
      },
      write: function (chunk, _, callback) {
        next(
          create(BridgeEventSchema, {
            type: { case: 'data', value: create(BridgeEvent_DataEventSchema, { payload: chunk }) },
          }),
        );
        callback();
      },
    });

    const transport = this._transportFactory.createTransport({
      initiator: request.initiator,
      topic: request.topic,
      ownPeerKey: request.ownPeerKey,
      remotePeerKey: request.remotePeerKey,
      stream: transportStream,
      sendSignal: async (signal) => {
        next(
          create(BridgeEventSchema, {
            type: { case: 'signal', value: create(BridgeEvent_SignalEventSchema, { payload: signal }) },
          }),
        );
      },
    });

    const transportState: TransportState = {
      proxyId,
      transport,
      connectorStream: transportStream,
      writeProcessedCallbacks: [],
    };

    transport.connected.on(() => pushNewState(ConnectionState.CONNECTED));

    transport.errors.handle(async (err) => {
      pushNewState(ConnectionState.CLOSED, err);
      void this._safeCloseTransport(transportState);
      close(err);
    });

    transport.closed.on(async () => {
      pushNewState(ConnectionState.CLOSED);
      void this._safeCloseTransport(transportState);
      close();
    });

    this._openTransports.set(proxyId, transportState);
    this._registration(proxyId).wake();

    transport.open().catch(async (err) => {
      pushNewState(ConnectionState.CLOSED, err);
      void this._safeCloseTransport(transportState);
      close(err);
    });

    ready();

    log('stream ready');

    pushNewState(ConnectionState.CONNECTING);
  }

  async sendSignal({ proxyId, signal }: SignalRequest): Promise<Empty> {
    invariant(signal, 'Signal request carries no signal.');
    const key = requirePublicKey(proxyId);
    const transport = await this._resolveTransport(key);
    if (!transport) {
      log('signal dropped for a transport this bridge closed', { proxyId: key });
      return create(EmptySchema, {});
    }

    await transport.transport.onSignal(signal);
    return create(EmptySchema, {});
  }

  async getDetails({ proxyId }: DetailsRequest): Promise<DetailsResponse> {
    const transport = await this._resolveTransport(requirePublicKey(proxyId), { wait: false });

    return create(DetailsResponseSchema, { details: (await transport?.transport.getDetails()) ?? 'transport closed' });
  }

  async getStats({ proxyId }: StatsRequest): Promise<StatsResponse> {
    // Sampled on an interval for the life of the connection, so it must never wait on one.
    const transport = await this._resolveTransport(requirePublicKey(proxyId), { wait: false });
    if (!transport) {
      return create(StatsResponseSchema, {
        stats: { bytesSent: 0, bytesReceived: 0, packetsSent: 0, packetsReceived: 0, rawStats: 'transport closed' },
      });
    }

    return create(StatsResponseSchema, { stats: await transport.transport.getStats() });
  }

  async sendData({ proxyId, payload }: DataRequest): Promise<Empty> {
    const key = requirePublicKey(proxyId);
    const transport = await this._resolveTransport(key);
    if (!transport) {
      log('data dropped for a transport this bridge closed', { proxyId: key, bytes: payload.length });
      return create(EmptySchema, {});
    }

    const bufferHasSpace = transport.connectorStream.push(payload);
    if (!bufferHasSpace) {
      await new Promise<void>((resolve) => {
        transport.writeProcessedCallbacks.push(resolve);
      });
    }
    return create(EmptySchema, {});
  }

  async close({ proxyId }: CloseRequest): Promise<Empty> {
    const key = requirePublicKey(proxyId);
    const transport = this._openTransports.get(key);
    if (transport) {
      this._openTransports.delete(key);
      await this._safeCloseTransport(transport);
    }
    return create(EmptySchema, {});
  }

  /**
   * The transport for a call, or `undefined` when this service has already closed it.
   *
   * Both ends of this bridge are asynchronous in both directions, so a call can arrive either side of
   * the transport's life: before the `open` stream's producer registers it, or after a close has been
   * announced on that stream but not yet read. Throwing on either is reported to the swarm as a
   * transport error, and the swarm answers that by tearing down whatever connection it holds to the
   * peer — including a replacement one the call knows nothing about.
   */
  private async _resolveTransport(
    proxyId: PublicKey,
    { wait = true }: { wait?: boolean } = {},
  ): Promise<TransportState | undefined> {
    const transport = this._openTransports.get(proxyId);
    if (transport) {
      return transport;
    }
    if (!wait || this._wasClosedHere(proxyId)) {
      return undefined;
    }

    const trigger = this._registration(proxyId);
    try {
      await trigger.wait({ timeout: OPEN_REGISTRATION_TIMEOUT });
    } finally {
      if (this._registrations.get(proxyId) === trigger && !this._openTransports.has(proxyId)) {
        this._registrations.delete(proxyId);
      }
    }
    return this._openTransports.get(proxyId);
  }

  private _registration(proxyId: PublicKey): Trigger {
    let trigger = this._registrations.get(proxyId);
    if (!trigger) {
      trigger = new Trigger();
      this._registrations.set(proxyId, trigger);
    }
    return trigger;
  }

  private _rememberClosed(proxyId: PublicKey): void {
    this._registrations.get(proxyId)?.wake();
    this._registrations.delete(proxyId);
    if (this._wasClosedHere(proxyId)) {
      return;
    }
    this._closedTransports.push(proxyId);
    if (this._closedTransports.length > CLOSED_TRANSPORT_HISTORY) {
      this._closedTransports.shift();
    }
  }

  /**
   * Whether this service closed the transport, as opposed to never having held it. A caller writing
   * to one it closed has simply not read the close off the event stream yet.
   */
  private _wasClosedHere(proxyId: PublicKey): boolean {
    return this._closedTransports.some((id) => id.equals(proxyId));
  }

  private async _safeCloseTransport(transport: TransportState): Promise<void> {
    if (this._openTransports.get(transport.proxyId) === transport) {
      this._openTransports.delete(transport.proxyId);
    }
    this._rememberClosed(transport.proxyId);

    transport.writeProcessedCallbacks.forEach((cb) => cb());

    try {
      await transport.transport.close();
    } catch (error: any) {
      log.warn('transport close error', { message: error?.message });
    }
    try {
      transport.connectorStream.end();
    } catch (error: any) {
      log.warn('connectorStream close error', { message: error?.message });
    }
    log('closed');
  }
}

const createStateUpdater = (next: (event: BridgeEvent) => void) => {
  return (state: ConnectionState, err?: Error) => {
    next(
      create(BridgeEventSchema, {
        type: {
          case: 'connection',
          value: create(BridgeEvent_ConnectionEventSchema, { state, error: err?.message }),
        },
      }),
    );
  };
};
