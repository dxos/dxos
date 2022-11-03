//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { schema } from '@dxos/protocols';
import { Command } from '@dxos/protocols/dist/src/proto/gen/dxos/mesh/muxer';

import { Framer } from './framer';
import { RpcPort } from './rpc-port';
import { Duplex } from 'stream';

const codec = schema.getCodecForType('dxos.mesh.muxer.Command');

export type CleanupCb = void | (() => void);

export type CreateChannelOpts = {
  contentType?: string;
}

type Cannel = {
  id: number;
  tag: string;
  remoteId?: number;
  contentType?: string;
  buffer: Uint8Array[];
  push?: (data: Uint8Array) => void;
};

type CreateChannelInternalParams = {
  tag: string;
  contentType?: string;
}

export class Muxer {
  private readonly _framer = new Framer();
  public readonly stream = this._framer.stream;

  private readonly _channelsByRemoteId = new Map<number, Cannel>();
  private readonly _channelsByTag = new Map<string, Cannel>();

  private _nextId = 0;
  private _destroyed = false;

  public close = new Event();

  constructor() {
    this._framer.port.subscribe((msg) => {
      this._handleCommand(codec.decode(msg));
    });
  }

  createStream(tag: string, opts: CreateChannelOpts = {}): NodeJS.ReadWriteStream {
    const channel = this._getOrCreateStream({
      tag,
      contentType: opts.contentType
    });
    const stream = new Duplex({
      write: (data, encoding, callback) => {
        this._sendCommand({
          data: {
            channelId: channel.id,
            data
          }
        });
        callback();
      },
      read: () => {
      },
    });
    channel.push = (data) => {
      stream.push(data);
    }
    return stream;
  }

  createPort(tag: string, opts: CreateChannelOpts = {}): RpcPort {
    const stream = this._getOrCreateStream({
      tag,
      contentType: opts.contentType
    });

    assert(!stream.push, `Port already open: ${tag}`);

    return {
      send: (data: Uint8Array) => {
        this._sendCommand({
          data: {
            channelId: stream.id,
            data
          }
        });
      },
      subscribe: (cb: (data: Uint8Array) => void) => {
        assert(!stream.push, 'Only one subscriber is allowed');
        for (const data of stream.buffer) {
          cb(data);
        }
        stream.buffer = [];
        stream.push = cb;
      }
    };
  }

  /**
   * Force-close with optional error.
   */
  destroy(err?: Error) {
    this._sendCommand({
      destroy: {
        error: err?.message
      }
    });
    this._dispose();
  }

  private _dispose() {
    if (this._destroyed) {
      return;
    }

    this._destroyed = true;
    this._framer.destroy();

    // TODO(dmaretskyi): Destroy streams.

    this.close.emit();
  }

  private _handleCommand(cmd: Command) {
  if (cmd.openChannel) {
      const stream = this._getOrCreateStream({
        tag: cmd.openChannel.tag,
        contentType: cmd.openChannel.contentType,
      })
      stream.remoteId = cmd.openChannel.id;
      this._channelsByRemoteId.set(stream.remoteId, stream);
    } else if (cmd.data) {
      const stream = this._channelsByRemoteId.get(cmd.data.channelId) ?? failUndefined();
      if (stream.push) {
        stream.push(cmd.data.data);
      } else {
        stream.buffer.push(cmd.data.data);
      }
    } else if (cmd.destroy) {
      this._dispose();
    }
  }

  private _sendCommand(cmd: Command) {
    // TODO(dmaretskyi): Error handling.
    this._framer.port.send(codec.encode(cmd));
  }

  private _getOrCreateStream(params: CreateChannelInternalParams): Cannel {
    let stream = this._channelsByTag.get(params.tag);
    if (!stream) {
      stream = {
        id: this._nextId++,
        tag: params.tag,
        contentType: params.contentType,
        buffer: []
      };
      this._channelsByTag.set(params.tag, stream);
      this._sendCommand({
        openChannel: {
          id: stream.id,
          tag: stream.tag,
          contentType: stream.contentType
        }
      });
    }
    return stream;
  }
}
