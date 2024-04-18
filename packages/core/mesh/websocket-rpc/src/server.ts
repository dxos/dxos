//
// Copyright 2023 DXOS.org
//

import { type IncomingMessage } from 'http';
import WebSocket from 'isomorphic-ws';
import { type Socket } from 'node:net';

import { log } from '@dxos/log';
import { createProtoRpcPeer, type ProtoRpcPeer, type ProtoRpcPeerOptions } from '@dxos/rpc';

export type ConnectionInfo = {
  request: IncomingMessage;
};

export type ConnectionHandler<C, S> = {
  onOpen?: (rpc: ProtoRpcPeer<C>) => Promise<void>;
  onClose?: (rpc: ProtoRpcPeer<C>) => Promise<void>;
} & Pick<ProtoRpcPeerOptions<C, S>, 'requested' | 'exposed' | 'handlers'>;

export type WebsocketRpcServerParams<C, S> = {
  onConnection: (info: ConnectionInfo) => Promise<ConnectionHandler<C, S>>;
} & WebSocket.ServerOptions;

export class WebsocketRpcServer<C, S> {
  private _server?: WebSocket.Server;

  constructor(private readonly _params: WebsocketRpcServerParams<C, S>) {}
  handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer) {
    this._server?.handleUpgrade(request, socket, head, (ws) => {
      this._server?.emit('connection', ws, request);
    });
  }

  async open() {
    this._server = new WebSocket.Server({
      ...this._params,
    });
    this._server.on('connection', async (socket, request) => {
      log('connection', { request });
      const info: ConnectionInfo = {
        request,
      };
      const { onOpen, onClose, ...options } = await this._params.onConnection(info);
      const rpc = createProtoRpcPeer<C, S>({
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

  async close() {
    this._server?.close();
  }
}
