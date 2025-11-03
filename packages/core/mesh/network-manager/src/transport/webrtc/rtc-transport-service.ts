//
// Copyright 2022 DXOS.org
//

import { Duplex } from 'node:stream';

import { Stream } from '@dxos/codec-protobuf/stream';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type BridgeEvent,
  type BridgeService,
  type CloseRequest,
  type ConnectionRequest,
  ConnectionState,
  type DataRequest,
  type DetailsRequest,
  type DetailsResponse,
  type SignalRequest,
  type StatsRequest,
  type StatsResponse,
} from '@dxos/protocols/proto/dxos/mesh/bridge';
import { ComplexMap } from '@dxos/util';

import { type IceProvider } from '../../signal';
import { type Transport, type TransportFactory } from '../transport';

import { createRtcTransportFactory } from './rtc-transport-factory';

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
    const existingTransport = this._openTransports.get(request.proxyId);
    if (existingTransport) {
      log.error('requesting a new transport bridge for an existing proxy');
      void this._safeCloseTransport(existingTransport);
      this._openTransports.delete(request.proxyId);
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
          next({ data: { payload: chunk } });
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
          next({ signal: { payload: signal } });
        },
      });

      const transportState: TransportState = {
        proxyId: request.proxyId,
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

      this._openTransports.set(request.proxyId, transportState);

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

  async sendSignal({ proxyId, signal }: SignalRequest): Promise<void> {
    const transport = this._openTransports.get(proxyId);
    invariant(transport);

    await transport.transport.onSignal(signal);
  }

  async getDetails({ proxyId }: DetailsRequest): Promise<DetailsResponse> {
    const transport = this._openTransports.get(proxyId);
    invariant(transport);

    return { details: await transport.transport.getDetails() };
  }

  async getStats({ proxyId }: StatsRequest): Promise<StatsResponse> {
    const transport = this._openTransports.get(proxyId);
    invariant(transport);

    return { stats: await transport.transport.getStats() };
  }

  async sendData({ proxyId, payload }: DataRequest): Promise<void> {
    const transport = this._openTransports.get(proxyId);
    invariant(transport);

    const bufferHasSpace = transport.connectorStream.push(payload);
    if (!bufferHasSpace) {
      await new Promise<void>((resolve) => {
        transport.writeProcessedCallbacks.push(resolve);
      });
    }
  }

  async close({ proxyId }: CloseRequest): Promise<void> {
    const transport = this._openTransports.get(proxyId);
    if (!transport) {
      return;
    }

    this._openTransports.delete(proxyId);
    await this._safeCloseTransport(transport);
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

const createStateUpdater = (next: (event: BridgeEvent) => void) => (state: ConnectionState, err?: Error) => {
  next({
    connection: {
      state,
      ...(err ? { error: err.message } : undefined),
    },
  });
};
