//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { Duplex } from 'stream';

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  BridgeService,
  ConnectionRequest,
  SignalRequest,
  DataRequest,
  BridgeEvent,
  ConnectionState,
  CloseRequest
} from '@dxos/protocols/proto/dxos/mesh/bridge';
import { ComplexMap } from '@dxos/util';

import { WebRTCTransport } from './webrtc-transport';

export class WebRTCTransportService implements BridgeService {
  private readonly transports = new ComplexMap<PublicKey, { transport: WebRTCTransport; stream: Duplex }>(
    PublicKey.hash
  );

  // prettier-ignore
  constructor(
    private readonly _webrtcConfig?: any
  ) {}

  open(request: ConnectionRequest): Stream<BridgeEvent> {
    const event = new Event<BridgeEvent>();

    const duplex: Duplex = new Duplex({
      read: () => {
        console.log('Duplex read');
      },
      write: function (chunk) {
        console.log('Duplex write:', chunk);
        event.emit({ data: { payload: chunk } });
      }
    });

    const transport = new WebRTCTransport({
      initiator: request.initiator,
      stream: duplex,
      ownId: PublicKey.from(Buffer.from('')),
      remoteId: PublicKey.from(Buffer.from('')),
      sessionId: PublicKey.from(Buffer.from('')),
      topic: PublicKey.from(Buffer.from('')),
      sendSignal: (msg) => {
        console.log('WebRTCTransport Signal');
        event.emit({
          signal: { payload: msg.data.signal }
        });
      }
    });
    const rpcStream: Stream<BridgeEvent> = new Stream(({ ready, next, close }) => {
      console.log(
        `Creating webrtc connection initiator=${request.initiator} webrtcConfig=${JSON.stringify(this._webrtcConfig)}`
      );
      next({
        connection: {
          state: ConnectionState.CONNECTING
        }
      });

      event.on((data) => next(data));

      transport.connected.on(async () => {
        next({
          connection: {
            state: ConnectionState.CONNECTED
          }
        });
      });

      transport.errors.handle(async (err) => {
        next({
          connection: {
            state: ConnectionState.CLOSED,
            error: err.toString()
          }
        });
        close(err);
      });

      transport.closed.on(async () => {
        next({
          connection: {
            state: ConnectionState.CLOSED
          }
        });
        close();
      });

      ready();
    });

    this.transports.set(request.proxyId, { transport, stream: duplex });
    return rpcStream;
  }

  async sendSignal({ proxyId, signal }: SignalRequest): Promise<void> {
    console.log('sendSignal');
    assert(this.transports.has(proxyId));
    await this.transports.get(proxyId)!.transport.signal(signal);
  }

  async sendData({ proxyId, payload }: DataRequest): Promise<void> {
    console.log('sendData');
    assert(this.transports.has(proxyId));
    await this.transports.get(proxyId)!.stream.push(payload);
  }

  async close({ proxyId }: CloseRequest) {
    await this.transports.get(proxyId)?.transport.close();
    await this.transports.get(proxyId)?.stream.end();
    this.transports.delete(proxyId);
    log('Closed.');
  }
}
