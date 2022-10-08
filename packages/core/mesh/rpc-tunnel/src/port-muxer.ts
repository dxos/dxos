//
// Copyright 2022 DXOS.org
//

import { log } from '@dxos/log';
import { RpcPort } from '@dxos/rpc';

import { MessageData } from './message';
import { createIFramePort, createWorkerPort, IFramePortOptions, WorkerPortOptions } from './ports';

/**
 * Facilitates the multiplexing of multiple RpcPorts over a single MessagePort.
 */
export class PortMuxer {
  private readonly _activeChannels = new Map<string, (msg: Uint8Array) => void>();
  private readonly _rpcPorts = new Map<string, RpcPort>();

  constructor (private readonly _messagePort?: MessagePort) {
    if (this._messagePort) {
      this._messagePort.onmessage = event => this.onWorkerMessage(event);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => this.onWindowMessage(event));
    }
  }

  private createWorkerPort (channel: string, options: WorkerPortOptions) {
    const port = createWorkerPort({
      ...options,
      subscribe: callback => {
        this._activeChannels.set(channel, callback);
        return () => this._activeChannels.delete(channel);
      }
    });
    this._rpcPorts.set(channel, port);

    return port;
  }

  private createIFramePort (channel: string, options: IFramePortOptions) {
    const port = createIFramePort(options);
    this._rpcPorts.set(channel, port);

    return port;
  }

  createPort (options: Omit<WorkerPortOptions, 'port'> | IFramePortOptions) {
    if ('origin' in options) {
      return this.createIFramePort(options.channel, options);
    }

    if (!this._messagePort) {
      throw new Error('Message port is required to create worker ports');
    }

    return this.createWorkerPort(options.channel, { ...options, port: this._messagePort });
  }

  private onWorkerMessage (event: MessageEvent<MessageData>) {
    const message = event.data;
    log.debug('Recieved message from worker port', {
      channel: message.channel,
      payload: message.payload
    });

    const callback = this._activeChannels.get(message.channel);
    callback?.(new Uint8Array(message.payload));
  }

  private onWindowMessage (event: MessageEvent<MessageData>) {
    const message = event.data;
    log.debug('Recieved message from window', {
      channel: message.channel,
      payload: message.payload
    });
  }
}
