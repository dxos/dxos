//
// Copyright 2022 DXOS.org
//

import { Duplex } from 'node:stream';

import { Stream } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  BridgeService,
  ConnectionRequest,
  SignalRequest,
  DataRequest,
  BridgeEvent,
  ConnectionState,
  CloseRequest,
} from '@dxos/protocols/proto/dxos/mesh/bridge';
import { ComplexMap } from '@dxos/util';

import { SimplePeerTransport } from './simplepeer-transport';

type TransportState = {
  transport: SimplePeerTransport;
  stream: Duplex;
  writeCallbacks: (() => void)[];
};

export class SimplePeerTransportService implements BridgeService {
  private readonly transports = new ComplexMap<PublicKey, TransportState>(PublicKey.hash);

  constructor(private readonly _webrtcConfig?: any) {}

  open(request: ConnectionRequest): Stream<BridgeEvent> {
    const rpcStream: Stream<BridgeEvent> = new Stream(({ ready, next, close }) => {
      const duplex: Duplex = new Duplex({
        read: () => {
          const callbacks = [...transportState.writeCallbacks];
          transportState.writeCallbacks.length = 0;
          for (const cb of callbacks) {
            cb();
          }
        },
        write: function (chunk, _, callback) {
          next({ data: { payload: chunk } });
          callback();
        },
      });

      const transport = new SimplePeerTransport({
        initiator: request.initiator,
        stream: duplex,
        webrtcConfig: this._webrtcConfig,
        sendSignal: async (signal) => {
          next({
            signal: { payload: signal },
          });
        },
      });

      next({
        connection: {
          state: ConnectionState.CONNECTING,
        },
      });

      transport.connected.on(() => {
        next({
          connection: {
            state: ConnectionState.CONNECTED,
          },
        });
      });

      transport.errors.handle((err) => {
        next({
          connection: {
            state: ConnectionState.CLOSED,
            error: err.toString(),
          },
        });
        close(err);
      });

      transport.closed.on(() => {
        next({
          connection: {
            state: ConnectionState.CLOSED,
          },
        });
        close();
      });

      const transportState: TransportState = {
        transport,
        stream: duplex,
        writeCallbacks: [],
      };

      ready();

      this.transports.set(request.proxyId, transportState);
    });

    return rpcStream;
  }

  async sendSignal({ proxyId, signal }: SignalRequest): Promise<void> {
    invariant(this.transports.has(proxyId));
    await this.transports.get(proxyId)!.transport.signal(signal);
  }

  async sendData({ proxyId, payload }: DataRequest): Promise<void> {
    invariant(this.transports.has(proxyId));
    const state = this.transports.get(proxyId)!;
    const bufferHasSpace = state.stream.push(payload);
    if (!bufferHasSpace) {
      await new Promise<void>((resolve) => {
        state.writeCallbacks.push(resolve);
      });
    }
  }

  async close({ proxyId }: CloseRequest) {
    await this.transports.get(proxyId)?.transport.destroy();
    await this.transports.get(proxyId)?.stream.end();
    this.transports.delete(proxyId);
    log('Closed.');
  }
}
