//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import WebSocket from 'isomorphic-ws';

import { Trigger, Event } from '@dxos/async';
import { Any, Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/protocols';
import { createBundledRpcClient, ProtoRpcClient } from '@dxos/rpc';

import { schema } from '../proto/gen';
import { Message, Signal } from '../proto/gen/dxos/mesh/signal';
interface Services {
  Signal: Signal
}

const log = debug('dxos:network-manager:signal-rpc-client');

export class SignalRPCClient {
  private readonly _socket: WebSocket;
  private readonly _rpc: ProtoRpcClient<Services>;
  private readonly _connectTrigger = new Trigger();

  readonly connected = new Event();
  readonly disconnected = new Event();
  readonly error = new Event<Error>();

  constructor (
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

    this._socket.onerror = (e: WebSocket.ErrorEvent) => {
      log(`Signal socket error ${this._url} ${e.message}`);
      this.error.emit(e.error ?? new Error(e.message));
    };

    this._rpc = createBundledRpcClient(
      {
        Signal: schema.getService('dxos.mesh.signal.Signal')
      },
      {
        noHandshake: true,
        port: {
          send: msg => {
            this._socket.send(msg);
          },
          subscribe: cb => {
            this._socket.onmessage = async (msg: WebSocket.MessageEvent) => {
              if (typeof Blob !== 'undefined' && msg.data instanceof Blob) {
                cb(Buffer.from(await msg.data.arrayBuffer()));
              } else {
                cb(msg.data as any);
              }
            };
          }
        }
      }
    );
  }

  async join (topic: PublicKey, peerId: PublicKey) {
    log('join', topic, peerId);
    await this._connectTrigger.wait();
    const swarmStream = this._rpc.rpc.Signal.join({
      swarm: topic.asUint8Array(),
      peer: peerId.asUint8Array()
    });
    await swarmStream.waitUntilReady();
    return swarmStream;
  }

  async receiveMessages (peerId: PublicKey): Promise<Stream<Message>> {
    await this._connectTrigger.wait();
    const messageStream = this._rpc.rpc.Signal.receiveMessages({
      peer: peerId.asUint8Array()
    });
    await messageStream.waitUntilReady();
    return messageStream;
  }

  async sendMessage (author: PublicKey, recipient: PublicKey, message: Any) {
    log('sendMessage', author, recipient, message);
    await this._connectTrigger.wait();
    await this._rpc.rpc.Signal.sendMessage({
      author: author.asUint8Array(),
      recipient: recipient.asUint8Array(),
      payload: message
    });
  }

  async close () {
    try {
      await this._rpc.close();
    } finally {
      this._socket.close();
    }
  }
}
