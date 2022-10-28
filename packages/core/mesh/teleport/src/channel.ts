//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { Duplex } from 'stream';
import type { CleanupCb } from './muxer';
import { RpcPort } from './rpc-port';

export type CreateStreamOpts = {
  contentType?: string;
};

export type StreamHandle = {
  id: number;
  tag: string;
  remoteId?: number
  contentType?: string;
  channel: Channel;
  buffer: Uint8Array[];
  push?: (data: Uint8Array) => void;
}

export class Channel {
  /**
   * @internal
   */
  public remoteId?: number;

  /**
   * @internal
   */
  public isOpen = false


  /**
   * @internal
   */
  public readonly streams = new Map<string, StreamHandle>();

  constructor(
    public readonly tag: string,
    private readonly _onOpen: (channel: Channel) => CleanupCb,
    private readonly _onStream: (tag: string, opts: CreateStreamOpts) => StreamHandle,
    private readonly _sendData: (streamId: number, data: Uint8Array) => void,
  ) {}

  createStream(tag: string, opts: CreateStreamOpts = {}): NodeJS.ReadWriteStream {
    const stream = this._onStream(tag, opts);
    return new Duplex(); // TODO(dmaretskyi): .
  }

  createPort(tag: string, opts: CreateStreamOpts = {}): RpcPort {
    const stream = this._onStream(tag, opts);

    return {
      send: (data: Uint8Array) => {
        this._sendData(stream.id, data); 
      },
      subscribe: (cb: (data: Uint8Array) => void) => {
        assert(!stream.push, 'Only one subscriber is allowed');
        for(const data of stream.buffer) {
          cb(data);
        }
        stream.buffer = [];
        stream.push = cb;
      }
    }
  }

  /**
   * @internal
   */
  open() {
    this.isOpen = true;

    const cleanup = this._onOpen(this)
    // TODO(dmaretskyi): .
  }
}
