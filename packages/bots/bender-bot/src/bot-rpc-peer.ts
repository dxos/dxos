//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import WebSocket from 'isomorphic-ws';

import { Trigger, Event } from '@dxos/async';
import { schema } from '@dxos/protocols';
import { BotHost, BotService } from '@dxos/protocols/proto/dxos/service/scheduler';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';

const log = debug('dxos:network-manager:bot-rpc-client');

export class BotRPCPeer {
  private readonly _socket: WebSocket;
  private readonly _rpc: ProtoRpcPeer<{ BotHost: BotHost }>;
  private readonly _connectTrigger = new Trigger();

  readonly connected = new Event();
  readonly disconnected = new Event();
  readonly error = new Event<Error>();

  constructor(private readonly _url: string, private readonly _handlers: BotService) {
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

    this._rpc = createProtoRpcPeer({
      requested: {
        BotHost: schema.getService('dxos.service.scheduler.BotHost')
      },
      exposed: {
        BotService: schema.getService('dxos.service.scheduler.BotService')
      },
      handlers: {
        BotService: this._handlers
      },
      noHandshake: true,
      timeout: 1_000_000,
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
      }
    });
  }

  get rpc(): BotHost {
    return this._rpc.rpc.BotHost;
  }
}
