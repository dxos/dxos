//
// Copyright 2022 DXOS.org
//

import { Duplex } from 'node:stream';

import { Stream } from '@dxos/codec-protobuf/stream';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Mesh } from '@dxos/protocols';
import { EMPTY } from '@dxos/protocols/buf';
import {
  type BridgeEvent,
  type CloseRequest,
  type ConnectionRequest,
  ConnectionState,
  type DataRequest,
  type DetailsRequest,
  type DetailsResponse,
  type SignalRequest,
  type StatsRequest,
  type StatsResponse,
} from '@dxos/protocols/buf/dxos/mesh/bridge_pb';
import { ComplexMap } from '@dxos/util';

import { type PublicKey as BufPublicKey } from '@dxos/protocols/buf/dxos/keys_pb';

import { type IceProvider } from '../../signal';
import { type Transport, type TransportFactory } from '../transport';

import { createRtcTransportFactory } from './rtc-transport-factory';

const fromBufKey = (key: BufPublicKey): PublicKey => PublicKey.from(key.data);

type TransportState = {
  proxyId: PublicKey;
  transport: Transport;
  connectorStream: Duplex;
  writeProcessedCallbacks: (() => void)[];
};

export class RtcTransportService implements Mesh.BridgeService {
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
    const proxyId = fromBufKey(request.proxyId!);
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
          next({ type: { case: 'data', value: { payload: chunk } } } as BridgeEvent);
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
          // Signal types are structurally compatible between proto and buf.
          next({ type: { case: 'signal', value: { payload: signal } } } as BridgeEvent);
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

  async sendSignal({ proxyId, signal }: SignalRequest) {
    const key = fromBufKey(proxyId!);
    const transport = this._openTransports.get(key);
    invariant(transport);

    // Signal types are structurally compatible between buf and proto.
    await transport.transport.onSignal(signal as never);
    return EMPTY;
  }

  async getDetails({ proxyId }: DetailsRequest): Promise<DetailsResponse> {
    const key = fromBufKey(proxyId!);
    const transport = this._openTransports.get(key);
    invariant(transport);

    return { details: await transport.transport.getDetails() } as DetailsResponse;
  }

  async getStats({ proxyId }: StatsRequest): Promise<StatsResponse> {
    const key = fromBufKey(proxyId!);
    const transport = this._openTransports.get(key);
    invariant(transport);

    return { stats: await transport.transport.getStats() } as unknown as StatsResponse;
  }

  async sendData({ proxyId, payload }: DataRequest) {
    const key = fromBufKey(proxyId!);
    const transport = this._openTransports.get(key);
    invariant(transport);

    const bufferHasSpace = transport.connectorStream.push(payload);
    if (!bufferHasSpace) {
      await new Promise<void>((resolve) => {
        transport.writeProcessedCallbacks.push(resolve);
      });
    }
    return EMPTY;
  }

  async close({ proxyId }: CloseRequest) {
    const key = fromBufKey(proxyId!);
    const transport = this._openTransports.get(key);
    if (!transport) {
      return EMPTY;
    }

    this._openTransports.delete(key);
    await this._safeCloseTransport(transport);
    return EMPTY;
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
    next({
      type: {
        case: 'connection',
        value: {
          state,
          ...(err ? { error: err.message } : undefined),
        },
      },
    } as BridgeEvent);
  };
};
