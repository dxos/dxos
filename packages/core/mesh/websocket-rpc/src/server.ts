//
// Copyright 2023 DXOS.org
//

import { type IncomingMessage } from 'http';
import { type Socket } from 'node:net';

import WebSocket from 'isomorphic-ws';

import { log } from '@dxos/log';
import { type GenService, type GenServiceMethods } from '@dxos/protocols/buf';
import { type BufProtoRpcPeer, type BufProtoRpcPeerOptions, createBufProtoRpcPeer } from '@dxos/rpc';

export type ConnectionInfo = {
  request: IncomingMessage;
};

export type ConnectionHandler<
  C extends Record<string, GenService<GenServiceMethods>>,
  S extends Record<string, GenService<GenServiceMethods>>,
> = {
  onOpen?: (rpc: BufProtoRpcPeer<C>) => Promise<void>;
  onClose?: (rpc: BufProtoRpcPeer<C>) => Promise<void>;
} & Pick<BufProtoRpcPeerOptions<C, S>, 'requested' | 'exposed' | 'handlers'>;

export type WebsocketRpcServerProps<
  C extends Record<string, GenService<GenServiceMethods>>,
  S extends Record<string, GenService<GenServiceMethods>>,
> = {
  onConnection: (info: ConnectionInfo) => Promise<ConnectionHandler<C, S>>;
} & WebSocket.ServerOptions;

export class WebsocketRpcServer<
  C extends Record<string, GenService<GenServiceMethods>>,
  S extends Record<string, GenService<GenServiceMethods>>,
> {
  private _server?: WebSocket.Server;

  constructor(private readonly _params: WebsocketRpcServerProps<C, S>) {}
  handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer): void {
    this._server?.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      this._server?.emit('connection', ws, request);
    });
  }

  async open(): Promise<void> {
    this._server = new WebSocket.Server({
      ...this._params,
    });
    this._server.on('connection', async (socket: WebSocket, request: IncomingMessage) => {
      log('connection', { url: request.url, headers: request.headers });
      const info: ConnectionInfo = {
        request,
      };
      const { onOpen, onClose, ...options } = await this._params.onConnection(info);
      const rpc = createBufProtoRpcPeer<C, S>({
        ...options,
        port: {
          send: (msg) => {
            socket.send(msg);
          },
          subscribe: (cb) => {
            socket.onmessage = async (msg: WebSocket.MessageEvent) => {
              if (typeof Blob !== 'undefined' && msg.data instanceof Blob) {
                cb(Buffer.from(await msg.data.arrayBuffer()));
              } else {
                cb(msg.data as any);
              }
            };
          },
        },
      });

      await rpc.open();
      await onOpen?.(rpc);
      socket.onclose = async () => {
        await onClose?.(rpc);
        await rpc.close();
      };
    });
  }

  async close(): Promise<void> {
    this._server?.close();
  }
}
