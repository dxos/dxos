//
// Copyright 2022 DXOS.org
//

import debug from 'debug';

import { RpcPort } from '@dxos/rpc';

import { MessageData } from '../message';

const log = debug('dxos:rpc-tunnel:worker-port');

export type WorkerPortOptions = {
  channel?: MessageChannel
  port: MessagePort
  source: string
  destination: string
}

/**
 * Create a RPC port for a worker.
 * @param options.channel Message channel of the worker to subscribe to.
 * @param options.port Message port to send message on.
 * @param options.source Identifier for sent messages.
 * @param options.destination Listen for recieved messages with this source.
 * @returns RPC port for messaging.
 */
export const createWorkerPort = ({ channel, port, source, destination }: WorkerPortOptions): RpcPort => ({
  send: async message => {
    // Based on https://stackoverflow.com/a/54646864/2804332.
    const payload = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);
    port.postMessage(
      {
        source,
        payload
      },
      [payload]
    );
  },
  subscribe: callback => {
    if (channel) {
      channel.addHandler(source, destination, ({ payload }) => callback(new Uint8Array(payload)));
      return () => channel.removeHandler(destination);
    }

    const handler = (event: MessageEvent<MessageData>) => {
      const message = event.data;
      if (message.source !== destination) {
        return;
      }

      log(`Recieved message from ${destination}:`, message);
      callback(new Uint8Array(message.payload));
    };

    port.onmessage = handler;
    return () => {
      port.onmessage = null;
    };
  }
});

/**
 * Facilitates the multiplexing of multiple RpcPorts over a single MessagePort.
 */
export class MessageChannel {
  private _nextId = 1;
  private readonly messagePorts = new Map<number, MessagePort>();
  private readonly _handlers = new Map<string, {
    source: string | RegExp
    handler: (data: MessageData) => void
  }>();

  constructor (private readonly _setup: (channel: MessageChannel, port: MessagePort) => Promise<void>) {}

  async onConnect (event: MessageEvent<any>) {
    await this.addPort(event.ports[0]);
  }

  onMessage (event: MessageEvent<MessageData>) {
    const message = event.data;
    const handlers = [...this._handlers.values()]
      .filter(({ source }) => {
        switch (typeof source) {
          case 'string':
            return source === message.source;
          default:
            return source.test(message.source);
        }
      })
      .map(({ handler }) => handler);
    if (handlers.length === 0) {
      return;
    }

    log(`Recieved message from ${message.source}`, message);
    handlers.map(handler => handler(message));
  }

  async addPort (port: MessagePort) {
    port.onmessage = event => this.onMessage(event);
    this.messagePorts.set(this._nextId, port);
    this._nextId++;
    await this._setup(this, port);
  }

  addHandler (id: string, source: string | RegExp, handler: (data: MessageData) => void) {
    this._handlers.set(id, { source, handler });
  }

  removeHandler (id: string) {
    this._handlers.delete(id);
  }
}
