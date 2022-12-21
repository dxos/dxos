//
// Copyright 2022 DXOS.org
//

import WebSocket from 'isomorphic-ws';
import assert from 'node:assert';

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
  private _socket?: WebSocket;
  private _rpc?: ProtoRpcPeer<Services>;
  private readonly _connectTrigger = new Trigger();

  readonly connected = new Event();
  readonly disconnected = new Event();
  readonly error = new Event<Error>();

  // prettier-ignore
  constructor(
    private readonly _url: string
  ) {
    this._socket = new WebSocket(this._url);

    this._rpc = createProtoRpcPeer({
      requested: {
        Signal: schema.getService('dxos.mesh.signal.Signal')
      },
      noHandshake: true,
      port: {
        send: (msg) => {
          this._socket!.send(msg);
        },
        subscribe: (cb) => {
          this._socket!.onmessage = async (msg: WebSocket.MessageEvent) => {
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

    this._socket.onopen = async () => {
      try {
        await this._rpc!.open();
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
      await this.close();
    };

    this._socket.onerror = (event: WebSocket.ErrorEvent) => {
      log.error(event.message, { url: this._url });
      this.error.emit(event.error ?? new Error(event.message));
    };
  }

  async close() {
    try {
      await this._rpc?.close();
    } catch (err) {
      log.catch(err);
    }
    this._socket?.close();
  }

  async join({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) {
    log('join', { topic, peerId });
    await this._connectTrigger.wait();
    assert(this._rpc, 'Rpc is not initialized');
    const swarmStream = this._rpc.rpc.Signal.join({
      swarm: topic.asUint8Array(),
      peer: peerId.asUint8Array()
    });
    await swarmStream.waitUntilReady();
    return swarmStream;
  }

  async receiveMessages(peerId: PublicKey): Promise<Stream<SignalMessage>> {
    log('receiveMessages', { peerId });
    await this._connectTrigger.wait();
    assert(this._rpc, 'Rpc is not initialized');
    const messageStream = this._rpc.rpc.Signal.receiveMessages({
      peer: peerId.asUint8Array()
    });
    await messageStream.waitUntilReady();
    return messageStream;
  }

  async sendMessage({ author, recipient, payload }: { author: PublicKey; recipient: PublicKey; payload: Any }) {
    log('sendMessage', { author, recipient, payload });
    await this._connectTrigger.wait();
    assert(this._rpc, 'Rpc is not initialized');
    await this._rpc.rpc.Signal.sendMessage({
      author: author.asUint8Array(),
      recipient: recipient.asUint8Array(),
      payload
    });
  }
}
