//
// Copyright 2022 DXOS.org
//

import WebSocket from 'isomorphic-ws';

import { Event, Trigger } from '@dxos/async';
import { log, logInfo } from '@dxos/log';
import { createProtoRpcPeer, ProtoRpcPeer, ProtoRpcPeerOptions } from '@dxos/rpc';

export type WebsocketRpcClientParams<C, S> = {
  url: string;
} & Pick<ProtoRpcPeerOptions<C, S>, 'requested' | 'exposed' | 'handlers'>;

export class WebsocketRpcClient<C, S> {
  private _socket?: WebSocket;
  private _rpc?: ProtoRpcPeer<C>;
  private readonly _connectTrigger = new Trigger();

  readonly connected = new Event();
  readonly disconnected = new Event();
  readonly error = new Event<Error>();

  constructor(private readonly _params: WebsocketRpcClientParams<C, S>) {
    this._rpc = createProtoRpcPeer({
      requested: this._params.requested,
      exposed: this._params.exposed,
      handlers: this._params.handlers,
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
        },
      },
    });
  }

  @logInfo
  get url() {
    return this._params.url;
  }

  async open() {
    this._socket = new WebSocket(this._params.url);

    this._socket.onopen = async () => {
      log('Socket open');
      try {
        await this._rpc!.open();
        log(`RPC open ${this._params.url}`);
        this.connected.emit();
        this._connectTrigger.wake();
      } catch (err: any) {
        this.error.emit(err);
      }
    };

    this._socket.onclose = async () => {
      log(`Disconnected ${this._params.url}`);
      this.disconnected.emit();
      await this.close();
    };

    this._socket.onerror = (event: WebSocket.ErrorEvent) => {
      log.error(event.message ?? 'Socket error', { url: this._params.url });
      const error = event.error ?? new Error(event.message);
      this.error.emit(error);
      this._connectTrigger.throw(error);
    };

    await this._connectTrigger.wait();
  }

  async close() {
    try {
      await this._rpc?.close();
    } catch (err) {
      log.catch(err);
    }
    this._socket?.close();
  }

  get rpc() {
    return this._rpc!.rpc;
  }
}
