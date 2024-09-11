//
// Copyright 2022 DXOS.org
//

import { Duplex } from 'node:stream';

import { Stream } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type BridgeService,
  type ConnectionRequest,
  type SignalRequest,
  type DataRequest,
  type BridgeEvent,
  ConnectionState,
  type CloseRequest,
  type DetailsRequest,
  type DetailsResponse,
  type StatsRequest,
  type StatsResponse,
} from '@dxos/protocols/proto/dxos/mesh/bridge';
import { ComplexMap } from '@dxos/util';

import { createRtcTransportFactory } from './rtc-transport-factory';
import { type IceProvider } from '../signal';
import { type Transport, type TransportFactory } from '../transport';

type TransportState = {
  transport: Transport;
  connectorStream: Duplex;
  writeProcessedCallbacks: (() => void)[];
};

export class RtcTransportService implements BridgeService {
  private readonly _openTransports = new ComplexMap<PublicKey, TransportState>(PublicKey.hash);
  private readonly _transportFactory: TransportFactory;

  constructor(
    private readonly _messagePort: MessagePort,
    private readonly _webrtcConfig?: RTCConfiguration,
    private readonly _iceProvider?: IceProvider,
  ) {
    this._transportFactory = createRtcTransportFactory(this._webrtcConfig, this._iceProvider);
  }

  open(request: ConnectionRequest): Stream<BridgeEvent> {
    const existingTransport = this._openTransports.get(request.proxyId);
    if (existingTransport) {
      log.error('requesting a new transport bridge for an existing proxy');
      void this._closeTransport(existingTransport);
      this._openTransports.delete(request.proxyId);
    }

    return new Stream<BridgeEvent>(({ ready, next, close }) => {
      const pushNewState = (state: ConnectionState, err?: Error) => {
        next({
          connection: {
            state,
            ...(err ? { error: err.message } : undefined),
          },
        });
      };

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
        transport,
        connectorStream: transportStream,
        writeProcessedCallbacks: [],
      };

      pushNewState(ConnectionState.CONNECTING);

      transport.connected.on(() => pushNewState(ConnectionState.CONNECTED));

      transport.errors.handle((err) => {
        pushNewState(ConnectionState.CLOSED, err);
        close(err);
      });

      transport.closed.on(() => {
        pushNewState(ConnectionState.CLOSED);
        close();
      });

      transport.open().catch(async (err) => {
        if (this._openTransports.get(request.proxyId) === transportState) {
          this._openTransports.delete(request.proxyId);
        }
        pushNewState(ConnectionState.CLOSED, err);
        await this._closeTransport(transportState);
      });

      this._openTransports.set(request.proxyId, transportState);

      ready();
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

  async close({ proxyId }: CloseRequest) {
    const transport = this._openTransports.get(proxyId);
    if (!transport) {
      return;
    }

    this._openTransports.delete(proxyId);
    await this._closeTransport(transport);
  }

  private async _closeTransport(transport: TransportState) {
    transport.writeProcessedCallbacks.forEach((cb) => cb());

    try {
      await transport.transport.close();
    } catch (error) {
      log.catch(error);
    }
    try {
      await transport.connectorStream.end();
    } catch (error) {
      log.catch(error);
    }
    log('closed');
  }
}
