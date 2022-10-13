//
// Copyright 2022 DXOS.org
//

import assert from "assert";
import SimplePeerConstructor, { Instance as SimplePeer } from "simple-peer";

import { Stream } from "@dxos/codec-protobuf";
import { raise } from "@dxos/debug";
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
import { ComplexMap } from "@dxos/util";

import { wrtc } from "./wrtc";
import { WebRTCTransport } from "./webrtc-transport";
import { Duplex } from "stream";

export class WebRTCTransportService implements BridgeService {
  protected transports = new ComplexMap<PublicKey, WebRTCTransport>((key) =>
    key.toHex()
  );

  constructor(private readonly _webrtcConfig?: any) {}

  open(request: ConnectionRequest): Stream<BridgeEvent> {
    const stream = new Duplex({ read: () => {}, write: () => {} });
    const transport = new WebRTCTransport({
      initiator: request.initiator,
      stream,
      ownId: PublicKey.from(""),
      remoteId: PublicKey.from(""),
      sessionId: PublicKey.from(""),
      topic: PublicKey.from(""),
      sendSignal: () => {},
    });

    this.transports.set(request.proxyId, transport);

    return new Stream(({ ready, next, close }) => {
      log(
        `Creating webrtc connection initiator=${
          request.initiator
        } webrtcConfig=${JSON.stringify(this._webrtcConfig)}`
      );

      next({
        connection: {
          state: ConnectionState.CONNECTING,
        },
      });

      transport.peer.on("data", async (payload) => {
        next({
          data: {
            payload,
          },
        });
      });

      transport.peer.on("signal", async (data) => {
        next({
          signal: {
            payload: { json: JSON.stringify(data) },
          },
        });
      });

      transport.peer.on("connect", () => {
        next({
          connection: {
            state: ConnectionState.CONNECTED,
          },
        });
      });

      transport.peer.on("error", async (err) => {
        next({
          connection: {
            state: ConnectionState.CLOSED,
            error: err.toString(),
          },
        });
        close(err);
      });

      transport.peer.on("close", async () => {
        next({
          connection: {
            state: ConnectionState.CLOSED,
          },
        });
        close();
      });

      ready();
    });
  }

  async sendSignal({ proxyId, signal }: SignalRequest): Promise<void> {
    this.transports.get(proxyId)!.signal(signal);
  }

  async sendData({ proxyId, payload }: DataRequest): Promise<void> {
    assert(this.transports.has(proxyId));
    this.transports.get(proxyId)!.peer.write(payload);
  }

  async close({ proxyId }: CloseRequest) {
    this.transports.get(proxyId)?.close();
    this.transports.delete(proxyId);
    log("Closed.");
  }
}
