//
// Copyright 2022 DXOS.org
//

import WebSocket from 'isomorphic-ws';

import { Event, Trigger } from '@dxos/async';
import { log, logInfo } from '@dxos/log';
import { type Rpc } from '@dxos/protocols';
import { type GenService, type GenServiceMethods } from '@dxos/protocols/buf';
import { type BufProtoRpcPeer, type BufProtoRpcPeerOptions, createBufProtoRpcPeer } from '@dxos/rpc';

import { WebSocketWithTokenAuth } from './token-auth';

export type WebsocketRpcClientProps<
  C extends Record<string, GenService<GenServiceMethods>>,
  S extends Record<string, GenService<GenServiceMethods>>,
> = {
  url: string;
  authenticationToken?: string;
} & Pick<BufProtoRpcPeerOptions<C, S>, 'requested' | 'exposed' | 'handlers' | 'noHandshake'>;

export class WebsocketRpcClient<
  C extends Record<string, GenService<GenServiceMethods>>,
  S extends Record<string, GenService<GenServiceMethods>>,
> {
  private _socket?: WebSocket;
  private _rpc?: BufProtoRpcPeer<C>;
  private readonly _connectTrigger = new Trigger();

  readonly connected = new Event();
  readonly disconnected = new Event();
  readonly error = new Event<Error>();

  constructor(private readonly _params: WebsocketRpcClientProps<C, S>) {
    this._rpc = createBufProtoRpcPeer({
      requested: this._params.requested,
      exposed: this._params.exposed,
      handlers: this._params.handlers,
      noHandshake: this._params.noHandshake,
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

  async open(): Promise<void> {
    if (this._params.authenticationToken) {
      this._socket = new WebSocketWithTokenAuth(this._params.url, this._params.authenticationToken);
    } else {
      this._socket = new WebSocket(this._params.url);
    }
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
      // Browsers do not include the error message in the event object, so we cannot discern 401 errors from other errors.
      log.error(event.message ?? 'Socket error', { url: this._params.url });
      const error = event.error ?? new Error(event.message);
      this.error.emit(error);
      this._connectTrigger.throw(error);
    };

    await this._connectTrigger.wait();
  }

  async close(): Promise<void> {
    try {
      await this._rpc?.close();
    } catch (err) {
      log.catch(err);
    }
    this._socket?.close();
  }

  get rpc(): { [K in keyof C]: Rpc.BufRpcClient<C[K]> } {
    return this._rpc!.rpc;
  }
}
