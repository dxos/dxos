//
// Copyright 2022 DXOS.org
//

import WebSocket from 'isomorphic-ws';

import { scheduleTaskInterval, TimeoutError, Trigger } from '@dxos/async';
import { type Any, type Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema, trace } from '@dxos/protocols';
import { type Message as SignalMessage, type Signal } from '@dxos/protocols/proto/dxos/mesh/signal';
import { createProtoRpcPeer, type ProtoRpcPeer } from '@dxos/rpc';

import { SignalRpcClientMonitor } from './signal-rpc-client-monitor';

const SIGNAL_KEEPALIVE_INTERVAL = 10000;

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
  getMetadata?: () => any;
};

export type SignalRPCClientParams = {
  url: string;
  callbacks?: SignalCallbacks;
};

export class SignalRPCClient {
  private readonly _socket: WebSocket;
  private readonly _rpc: ProtoRpcPeer<Services>;
  private readonly _connectTrigger = new Trigger();

  private _keepaliveCtx?: Context;

  private _closed = false;

  private readonly _url: string;
  private readonly _callbacks: SignalCallbacks;
  private readonly _closeComplete = new Trigger();

  private readonly _monitor = new SignalRpcClientMonitor();

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
        if (this._closed) {
          await this._safeCloseRpc();
          return;
        }
        log(`RPC open ${this._url}`);
        this._callbacks.onConnected?.();
        this._connectTrigger.wake();
        this._keepaliveCtx = new Context();
        scheduleTaskInterval(
          this._keepaliveCtx,
          async () => {
            // TODO(nf): use RFC6455 ping/pong once implemented in the browser?
            // TODO(nf): check for pong response from server (once implemented)
            // Current implementation of signal server ignores all text data messages, and does not send a response.
            // However this is enough to detect breakages in the connection as TCP will reset the connection if ACKs are not received.
            this._socket?.send('__ping__');
          },
          SIGNAL_KEEPALIVE_INTERVAL,
        );
      } catch (err: any) {
        this._callbacks.onError?.(err);
        this._socket.close();
        this._closed = true;
      }
    };

    this._socket.onclose = async () => {
      log(`Disconnected ${this._url}`);
      this._callbacks.onDisconnected?.();
      this._closeComplete.wake();
      await this.close();
    };

    this._socket.onerror = async (event: WebSocket.ErrorEvent) => {
      if (this._closed) {
        this._socket.close();
        return;
      }
      this._closed = true;

      this._callbacks.onError?.(event.error ?? new Error(event.message));
      await this._safeCloseRpc();

      log.warn(`Socket ${event.type ?? 'unknown'} error`, { message: event.message, url: this._url });
    };

    log.trace('dxos.mesh.signal-rpc-client.constructor', trace.end({ id: traceId }));
  }

  async close() {
    if (this._closed) {
      return;
    }
    this._closed = true;

    await this._keepaliveCtx?.dispose();
    try {
      await this._safeCloseRpc();

      if (this._socket.readyState === WebSocket.OPEN || this._socket.readyState === WebSocket.CONNECTING) {
        // close() only starts the closing handshake.
        this._socket.close();
      }

      await this._closeComplete.wait({ timeout: 1_000 });
    } catch (err) {
      const failureReason = err instanceof TimeoutError ? 'timeout' : err?.constructor?.name ?? 'unknown';
      this._monitor.recordClientCloseFailure({ failureReason });
    }
  }

  async join({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }) {
    log('join', { topic, peerId, metadata: this._callbacks?.getMetadata?.() });
    invariant(!this._closed, 'SignalRPCClient is closed');
    await this._connectTrigger.wait();
    const swarmStream = this._rpc.rpc.Signal.join({
      swarm: topic.asUint8Array(),
      peer: peerId.asUint8Array(),
      metadata: this._callbacks?.getMetadata?.(),
    });
    await swarmStream.waitUntilReady();
    return swarmStream;
  }

  async receiveMessages(peerId: PublicKey): Promise<Stream<SignalMessage>> {
    log('receiveMessages', { peerId });
    invariant(!this._closed, 'SignalRPCClient is closed');
    await this._connectTrigger.wait();
    const messageStream = this._rpc.rpc.Signal.receiveMessages({
      peer: peerId.asUint8Array(),
    });
    await messageStream.waitUntilReady();
    return messageStream;
  }

  async sendMessage({ author, recipient, payload }: { author: PublicKey; recipient: PublicKey; payload: Any }) {
    log('sendMessage', { author, recipient, payload, metadata: this._callbacks?.getMetadata?.() });
    invariant(!this._closed, 'SignalRPCClient is closed');
    await this._connectTrigger.wait();
    await this._rpc.rpc.Signal.sendMessage({
      author: author.asUint8Array(),
      recipient: recipient.asUint8Array(),
      payload,
      metadata: this._callbacks?.getMetadata?.(),
    });
  }

  private async _safeCloseRpc() {
    try {
      this._connectTrigger.reset();
      await this._rpc.close();
    } catch (err) {
      log.catch(err);
    }
  }
}
