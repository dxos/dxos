//
// Copyright 2022 DXOS.org
//

import assert from "assert";
import { Duplex, Readable } from "stream";

import { Stream } from "@dxos/codec-protobuf";
import { PublicKey } from "@dxos/keys";
import { log } from "@dxos/log";
import {
  BridgeService,
  ConnectionRequest,
  SignalRequest,
  DataRequest,
  BridgeEvent,
  ConnectionState,
  CloseRequest,
} from "@dxos/protocols/proto/dxos/mesh/bridge";
import { Event } from "@dxos/async";
import { ComplexMap } from "@dxos/util";

import { WebRTCTransport } from "./webrtc-transport";
import { Signal } from "@dxos/protocols/proto/dxos/mesh/swarm";
import { SignalMessage } from "../signal";

export class WebRTCTransportService implements BridgeService {
  private readonly transports = new ComplexMap<
    PublicKey,
    { transport: WebRTCTransport; stream: Duplex }
  >((key) => key.toHex());

  constructor(private readonly _webrtcConfig?: any) {}

  open(request: ConnectionRequest): Stream<BridgeEvent> {
    const rpcStream: Stream<BridgeEvent> = new Stream(({ ready, next, close }) => {
      console.log(
        `Creating webrtc connection initiator=${
          request.initiator
        } webrtcConfig=${JSON.stringify(this._webrtcConfig)}`
      );

      next({
        connection: {
          state: ConnectionState.CONNECTING,
        },
      });

      duplex.on('data', (payload) => {
        next({
          data: {
            payload
          }
        });
      });

      duplex.on('signal', (data) => {
        console.log({
          signal: {
            payload: data
          }
        })
        next({
          signal: {
            payload: data
          }
        });
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

      ready();
    });

    let duplex: Duplex;
    duplex = new Duplex({
      read: () => {},
      write: (chunk) => duplex.emit('data', chunk),
    });
    const transport = new WebRTCTransport({
      initiator: request.initiator,
      stream: duplex,
      ownId: PublicKey.from(""),
      remoteId: PublicKey.from(""),
      sessionId: PublicKey.from(""),
      topic: PublicKey.from(""),
      sendSignal: (msg) => {
        console.log('Signal');
        duplex.emit('signal', msg.data.signal)},
    });

    this.transports.set(request.proxyId, { transport, stream: duplex });
    return rpcStream;
  }

  async sendSignal({ proxyId, signal }: SignalRequest): Promise<void> {
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
    log("Closed.");
  }
}
