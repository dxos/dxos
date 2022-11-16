//
// Copyright 2022 DXOS.org
//

import WebSocket from 'isomorphic-ws';

import { Trigger, Event } from '@dxos/async';
import { Any, Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { Message as SignalMessage, Signal } from '@dxos/protocols/proto/dxos/mesh/signal';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';

interface Services {
  Signal: Signal;
}

export class SignalRPCClient {
  private readonly _socket: WebSocket;
  private readonly _rpc: ProtoRpcPeer<Services>;
  private readonly _connectTrigger = new Trigger();

  readonly connected = new Event();
  readonly disconnected = new Event();
  readonly error = new Event<Error>();

  // prettier-ignore
  constructor(
    private readonly _url: string
  ) {
    this._socket = new WebSocket(this._url);
    this._socket.onopen = async () => {
      try {
        await this._rpc.open();
        log(`RPC open ${this._url}`);
        this.connected.emit();
        this._connectTrigger.wake();
      } catch (err: any) {
        this.error.emit(err);
      }
    };

    this._socket.onclose = async () => {
      log(`Disconnected ${this._url}`);
      this.disconnected.emit();
      try {
        await this._rpc.close();
      } catch (err: any) {
        this.error.emit(err);
      }
    };

    this._socket.onerror = (event: WebSocket.ErrorEvent) => {
      log.error(`Signal socket error ${this._url} ${event.message}`);
      this.error.emit(event.error ?? new Error(event.message));
    };

    this._rpc = createProtoRpcPeer({
      requested: {
        Signal: schema.getService('dxos.mesh.signal.Signal')
      },
      noHandshake: true,
      port: {
        send: (msg) => {
          this._socket.send(msg);
        },
        subscribe: (cb) => {
          this._socket.onmessage = async (msg: WebSocket.MessageEvent) => {
            if (typeof Blob !== 'undefined' && msg.data instanceof Blob) {
              cb(Buffer.from(await msg.data.arrayBuffer()));
            } else {
              cb(msg.data as any);
            }
          };
        }
      },
      encodingOptions: {
        preserveAny: true
      }
    });
  }

  async join({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) {
    log('join', { topic, peerId });
    await this._connectTrigger.wait();
    const swarmStream = this._rpc.rpc.Signal.join({
      swarm: topic.asUint8Array(),
      peer: peerId.asUint8Array()
    });
    await swarmStream.waitUntilReady();
    return swarmStream;
  }

  async receiveMessages(peerId: PublicKey): Promise<Stream<SignalMessage>> {
    await this._connectTrigger.wait();
    const messageStream = this._rpc.rpc.Signal.receiveMessages({
      peer: peerId.asUint8Array()
    });
    await messageStream.waitUntilReady();
    return messageStream;
  }

  async sendMessage({ author, recipient, payload }: { author: PublicKey; recipient: PublicKey; payload: Any }) {
    log('sendMessage', { author, recipient, payload });
    await this._connectTrigger.wait();
    await this._rpc.rpc.Signal.sendMessage({
      author: author.asUint8Array(),
      recipient: recipient.asUint8Array(),
      payload
    });
  }

  async close() {
    try {
      await this._rpc.close();
    } finally {
      this._socket.close();
    }
  }
}
