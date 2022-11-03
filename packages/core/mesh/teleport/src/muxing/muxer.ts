//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { schema } from '@dxos/protocols';
import { Command } from '@dxos/protocols/dist/src/proto/gen/dxos/mesh/muxer';
import { log } from '@dxos/log'

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

/**
 * Channel based multiplexer.
 * 
 * Can be used to open a number of channels represented by streams or RPC ports.
 * Performs framing for RPC ports.
 * Will buffer data until the remote peer opens the channel.
 * 
 * The API will not advertise channels that as they are opened by the remote peer.
 * A higher level API (could be build on top of this muxer) for channel discovery is required.
 */
export class Muxer {
  private readonly _framer = new Framer();
  public readonly stream = this._framer.stream;

  private readonly _channelsByRemoteId = new Map<number, Cannel>();
  private readonly _channelsByTag = new Map<string, Cannel>();

  private _nextId = 0;
  private _destroyed = false;
  private _destroying = false;

  public close = new Event<Error | undefined>();

  constructor() {
    this._framer.port.subscribe((msg) => {
      this._handleCommand(codec.decode(msg));
    });
  }

  /**
   * Creates a duplex Node.js-style stream.
   * 
   * The remote peer is expected to call `createStream` with the same tag.
   * 
   * The stream is immediately readable and writable.
   * NOTE: 
   *  The remote peer will buffer data until the stream is opened remotely with the same tag.
   *  Having a channel open only on one side will cause a memory leak on the remote side.
   */
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

  /**
   * Creates an RPC port.
   * 
   * The remote peer is expected to call `createPort` with the same tag.
   * 
   * The stream is immediately usable.
   * NOTE: 
   *  The remote peer will buffer data until the stream is opened remotely with the same tag.
   *  Having a channel open only on one side will cause a memory leak on the remote side.
   */
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
    if (this._destroying) {
      return;
    }
    this._destroying = true;

    this._sendCommand({
      destroy: {
        error: err?.message
      }
    });
    this._dispose();
  }

  private _dispose(err?: Error) {
    if (this._destroyed) {
      return;
    }

    this._destroyed = true;
    this._framer.destroy();

    // TODO(dmaretskyi): Destroy streams.

    this.close.emit(err);
  }

  private _handleCommand(cmd: Command) {
    if(this._destroyed || this._destroying) {
      log.warn('Received command after destroy');
      return;
    }

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

  private async _sendCommand(cmd: Command) {
    Promise.resolve(this._framer.port.send(codec.encode(cmd))).catch(err => {
      this.destroy(err);
    });
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
