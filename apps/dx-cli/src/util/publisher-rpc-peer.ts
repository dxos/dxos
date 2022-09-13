//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import WebSocket from 'isomorphic-ws';

import { Trigger, Event } from '@dxos/async';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';

import { schema } from '../proto/gen';
import { Publisher } from '../proto/gen/dxos/service/publisher';

const log = debug('dxos:network-manager:publisher-rpc-peer');

export class PublisherRpcPeer {
  private readonly _socket: WebSocket;
  private readonly _rpc: ProtoRpcPeer<{ Publisher: Publisher }>;
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
      log(`Publisher socket error ${this._url} ${e.message}`);
      this.error.emit(e.error ?? new Error(e.message));
    };

    this._rpc = createProtoRpcPeer({
      requested: {
        Publisher: schema.getService('dxos.service.publisher.Publisher')
      },
      exposed: {},
      handlers: {},
      noHandshake: true,
      timeout: 1_000_000,
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
    });
  }

  get rpc (): Publisher {
    return this._rpc.rpc.Publisher;
  }

  async close () {
    try {
      await this._rpc.close();
    } finally {
      this._socket.close();
    }
  }
}
