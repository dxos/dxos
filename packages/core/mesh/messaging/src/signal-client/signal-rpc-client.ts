//
// Copyright 2022 DXOS.org
//

import WebSocket from 'isomorphic-ws';
import invariant from 'tiny-invariant';

import { Trigger } from '@dxos/async';
import { Any, Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema, trace } from '@dxos/protocols';
import { Message as SignalMessage, Signal } from '@dxos/protocols/proto/dxos/mesh/signal';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';

interface Services {
  Signal: Signal;
}

export type SignalCallbacks = {
  onConnected?: () => void;

  /**
   * Called on disconnect.
   * In case of error, `onError` will be called first and then `onDisconnected`.
   */
  onDisconnected?: () => void;

  onError?: (error: Error) => void;
};

export type SignalRPCClientParams = {
  url: string;
  callbacks?: SignalCallbacks;
};

export class SignalRPCClient {
  private _socket?: WebSocket;
  private _rpc?: ProtoRpcPeer<Services>;
  private readonly _connectTrigger = new Trigger();

  private _closed = false;

  private readonly _url: string;
  private readonly _callbacks: SignalCallbacks;

  constructor({ url, callbacks = {} }: SignalRPCClientParams) {
    const traceId = PublicKey.random().toHex();
    log.trace('dxos.mesh.signal-rpc-client.constructor', trace.begin({ id: traceId }));
    this._url = url;
    this._callbacks = callbacks;
    this._socket = new WebSocket(this._url);

    this._rpc = createProtoRpcPeer({
      requested: {
        Signal: schema.getService('dxos.mesh.signal.Signal'),
      },
      noHandshake: true,
      port: {
        send: (msg) => {
          if (this._closed) {
            // Do not send messages after close.
            return;
          }
          try {
            this._socket!.send(msg);
          } catch (err) {
            log.warn('send error', err);
          }
        },
        subscribe: (cb) => {
          this._socket!.onmessage = async (msg: WebSocket.MessageEvent) => {
            if (typeof Blob !== 'undefined' && msg.data instanceof Blob) {
              cb(Buffer.from(await msg.data.arrayBuffer()));
            } else {
              cb(msg.data as any);
            }
          };
        },
      },
      encodingOptions: {
        preserveAny: true,
      },
    });

    this._socket.onopen = async () => {
      try {
        await this._rpc!.open();
        log(`RPC open ${this._url}`);
        this._callbacks.onConnected?.();
        this._connectTrigger.wake();
      } catch (err: any) {
        this._callbacks.onError?.(err);
      }
    };

    this._socket.onclose = async () => {
      log(`Disconnected ${this._url}`);
      this._callbacks.onDisconnected?.();
      await this.close();
    };

    this._socket.onerror = async (event: WebSocket.ErrorEvent) => {
      if (this._closed) {
        // Ignore errors after close.
        return;
      }

      this._callbacks.onError?.(event.error ?? new Error(event.message));
      this._connectTrigger.reset();

      try {
        await this._rpc?.close();
      } catch (err) {
        log.catch(err);
      }
      this._closed = true;

      log.warn(event.message ?? 'Socket error', { url: this._url });
    };

    log.trace('dxos.mesh.signal-rpc-client.constructor', trace.end({ id: traceId }));
  }

  async close() {
    this._closed = true;
    try {
      await this._rpc?.close();
      this._socket?.close();
    } catch (err) {
      log.warn('close error', err);
    }
  }

  async join({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) {
    log('join', { topic, peerId });
    await this._connectTrigger.wait();
    invariant(!this._closed, 'SignalRPCClient is closed');
    invariant(this._rpc, 'Rpc is not initialized');
    const swarmStream = this._rpc.rpc.Signal.join({
      swarm: topic.asUint8Array(),
      peer: peerId.asUint8Array(),
    });
    await swarmStream.waitUntilReady();
    return swarmStream;
  }

  async receiveMessages(peerId: PublicKey): Promise<Stream<SignalMessage>> {
    log('receiveMessages', { peerId });
    invariant(!this._closed, 'SignalRPCClient is closed');
    await this._connectTrigger.wait();
    invariant(this._rpc, 'Rpc is not initialized');
    const messageStream = this._rpc.rpc.Signal.receiveMessages({
      peer: peerId.asUint8Array(),
    });
    await messageStream.waitUntilReady();
    return messageStream;
  }

  async sendMessage({ author, recipient, payload }: { author: PublicKey; recipient: PublicKey; payload: Any }) {
    log('sendMessage', { author, recipient, payload });
    invariant(!this._closed, 'SignalRPCClient is closed');
    await this._connectTrigger.wait();
    invariant(this._rpc, 'Rpc is not initialized');
    await this._rpc.rpc.Signal.sendMessage({
      author: author.asUint8Array(),
      recipient: recipient.asUint8Array(),
      payload,
    });
  }
}
