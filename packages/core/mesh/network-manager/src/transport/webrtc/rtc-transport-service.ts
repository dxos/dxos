//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { type Empty, EmptySchema } from '@bufbuild/protobuf/wkt';
import { Duplex } from 'node:stream';

import { Stream } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { requirePublicKey } from '@dxos/protocols/buf';
import { type BufService } from '@dxos/protocols/buf-service';
import {
  type BridgeEvent,
  BridgeEventSchema,
  BridgeEvent_ConnectionEventSchema,
  BridgeEvent_DataEventSchema,
  BridgeEvent_SignalEventSchema,
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

import { type IceProvider } from '../../signal';
import { type Transport, type TransportFactory } from '../transport';
import { createRtcTransportFactory } from './rtc-transport-factory';

type BridgeService = BufService<typeof BridgeServiceDesc>;

type TransportState = {
  proxyId: PublicKey;
  transport: Transport;
  connectorStream: Duplex;
  writeProcessedCallbacks: (() => void)[];
};

export class RtcTransportService implements BridgeService {
  private readonly _openTransports = new ComplexMap<PublicKey, TransportState>(PublicKey.hash);

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

    return new Stream<BridgeEvent>(({ ready, next, close }) => {
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

      transport.open().catch(async (err) => {
        pushNewState(ConnectionState.CLOSED, err);
        void this._safeCloseTransport(transportState);
        close(err);
      });

      ready();

      log('stream ready');

      pushNewState(ConnectionState.CONNECTING);
    });
  }

  async sendSignal({ proxyId, signal }: SignalRequest): Promise<Empty> {
    const transport = this._openTransports.get(requirePublicKey(proxyId));
    invariant(transport);
    invariant(signal, 'Signal request carries no signal.');

    await transport.transport.onSignal(signal);
    return create(EmptySchema, {});
  }

  async getDetails({ proxyId }: DetailsRequest): Promise<DetailsResponse> {
    const transport = this._openTransports.get(requirePublicKey(proxyId));
    invariant(transport);

    return create(DetailsResponseSchema, { details: await transport.transport.getDetails() });
  }

  async getStats({ proxyId }: StatsRequest): Promise<StatsResponse> {
    const transport = this._openTransports.get(requirePublicKey(proxyId));
    invariant(transport);

    return create(StatsResponseSchema, { stats: await transport.transport.getStats() });
  }

  async sendData({ proxyId, payload }: DataRequest): Promise<Empty> {
    const transport = this._openTransports.get(requirePublicKey(proxyId));
    invariant(transport);

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

  private async _safeCloseTransport(transport: TransportState): Promise<void> {
    if (this._openTransports.get(transport.proxyId) === transport) {
      this._openTransports.delete(transport.proxyId);
    }

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
