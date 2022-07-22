//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import WebSocket from 'isomorphic-ws';
import nanomessagerpc from 'nanomessage-rpc';
import assert from 'node:assert';
import { promisify } from 'util';

import { Event, Trigger, sleep } from '@dxos/async';

import { SignalApi } from './signal-api';

const log = debug('dxos:network-manager:websocket-rpc');

const RPC_TIMEOUT = 3_000;

/**
 * A websocket connection paired with nanomessage-rpc endpoint.
 *
 * Provides lifecycle events and command trace.
 *
 * Does not automatically reconnect, if the connection is dropped client must recreate the class instance.
 */
export class WebsocketRpc {
  private readonly _connectTrigger = new Trigger();
  private readonly _socket: WebSocket;
  private readonly _rpc: any;
  private _messageId = Date.now();

  readonly commandTrace = new Event<SignalApi.CommandTrace>();
  readonly connected = new Event();
  readonly disconnected = new Event();
  readonly error = new Event<Error>();

  /**
   * @param _host Signal server websocket URL.
   */
  constructor (
    private readonly _host: string
  ) {
    this._socket = new WebSocket(this._host);
    this._socket.onopen = async () => {
      log(`Websocket connected ${this._host}`);
      this._connectTrigger.wake();
      try {
        await this._rpc.open();
        log(`RPC open ${this._host}`);
        this.connected.emit();
      } catch (err: any) {
        this.error.emit(err);
      }
    };

    this._socket.onclose = async () => {
      log(`Disconnected ${this._host}`);
      this.disconnected.emit();
      try {
        await this._rpc.close();
      } catch (err: any) {
        this.error.emit(err);
      }
    };

    this._socket.onerror = e => {
      log(`Signal socket error ${this._host} ${e.message}`);
      this.error.emit(e.error ?? new Error(e.message));
    };

    this._rpc = nanomessagerpc({
      send: async (data: Uint8Array) => {
        await this._connectTrigger.wait();
        assert(this._socket, 'No socket');
        await promisify(this._socket.send.bind(this._socket) as any)(data);
      },
      subscribe: (next: (data: any) => void) => {
        void this._connectTrigger.wait().then(() => {
          assert(this._socket, 'No socket');
          this._socket.onmessage = async e => {
            try {
              // `e.data` is Buffer in node, and Blob in chrome.
              let data: Buffer;
              if (Object.getPrototypeOf(e.data).constructor.name === 'Blob') {
                data = Buffer.from(await (e.data as any).arrayBuffer());
              } else {
                data = e.data as any;
              }
              next(data);
            } catch (err: any) {
              this.error.emit(err);
            }
          };
        });

        return () => {
          if (this._socket) {
            this._socket.onmessage = () => {};
          }
        };
      }
    });
    this._rpc.on('error', (error: Error) => this.error.emit(error));
  }

  async close () {
    try {
      await this._rpc.close();
    } finally {
      this._socket.close();
    }
  }

  async call (method: string, payload: any): Promise<any> {
    const start = Date.now();
    try {
      const response = await Promise.race([
        (async () => {
          await this._rpc.open();
          await this._connectTrigger.wait();
          return this._rpc.call(method, payload);
        })(),
        sleep(RPC_TIMEOUT).then(() => Promise.reject(new Error(`Signal RPC call timed out in ${RPC_TIMEOUT} ms`)))
      ]);
      this.commandTrace.emit({
        messageId: `${this._host}-${this._messageId++}`,
        host: this._host,
        incoming: false,
        time: Date.now() - start,
        method,
        payload,
        response
      });
      log(`Signal RPC ${this._host}: ${method} ${JSON.stringify(payload)} ${JSON.stringify(response)}`);
      return response;
    } catch (err: any) {
      log(`Signal RPC error ${this._host}: ${method} ${JSON.stringify(payload)} ${err.message}`);
      this.commandTrace.emit({
        messageId: `${this._host}-${this._messageId++}`,
        host: this._host,
        incoming: false,
        time: Date.now() - start,
        method,
        payload,
        error: err.message
      });
      throw err;
    }
  }

  async emit (method: string, data: any) {
    this.commandTrace.emit({
      messageId: `${this._host}-${this._messageId++}`,
      host: this._host,
      incoming: false,
      time: 0,
      method,
      payload: data
    });
    return this._rpc.emit('signal', data);
  }

  addHandler (method: string, handler: (data: any) => Promise<any>) {
    this._rpc.actions({
      [method]: async (data: any) => {
        const begin = Date.now();
        try {
          const response = await handler(data);
          this.commandTrace.emit({
            messageId: `${this._host}-${this._messageId++}`,
            host: this._host,
            incoming: true,
            time: Date.now() - begin,
            method,
            payload: data,
            response
          });
          return response;
        } catch (error: any) {
          this.commandTrace.emit({
            messageId: `${this._host}-${this._messageId++}`,
            host: this._host,
            incoming: true,
            time: Date.now() - begin,
            method,
            payload: data,
            error: error.message
          });
          throw error;
        }
      }
    });
  }

  subscribe (method: string, handler: (data: any) => void) {
    this._rpc.on(method, (data: any) => {
      this.commandTrace.emit({
        messageId: `${this._host}-${this._messageId++}`,
        host: this._host,
        incoming: true,
        time: 0,
        method,
        payload: data
      });
      handler(data);
    });
  }
}
