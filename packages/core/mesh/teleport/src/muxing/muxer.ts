//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { Duplex } from 'stream';

import { Event } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { Command } from '@dxos/protocols/proto/dxos/mesh/muxer';

import { Framer } from './framer';
import { RpcPort } from './rpc-port';

const codec = schema.getCodecForType('dxos.mesh.muxer.Command');

export type CleanupCb = void | (() => void);

export type CreateChannelOpts = {
  /**
   * MIME type of the wire content.
   *
   * Examples:
   *  - application/octet-stream
   *  - application/x-protobuf; messageType="dxos.rpc.Message"
   */
  contentType?: string;
};

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

  private readonly _channelsByLocalId = new Map<number, Channel>();
  private readonly _channelsByTag = new Map<string, Channel>();

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
   * The remote peer is expected to call `createStream` with the same tag.
   * The stream is immediately readable and writable.
   * NOTE: The data will be buffered until the stream is opened remotely with the same tag (may cause a memory leak).
   */
  createStream(tag: string, opts: CreateChannelOpts = {}): NodeJS.ReadWriteStream {
    const channel = this._getOrCreateStream({
      tag,
      contentType: opts.contentType
    });
    assert(!channel.push, `Channel already open: ${tag}`);

    const stream = new Duplex({
      write: (data, encoding, callback) => {
        this._sendData(channel, data);
        // TODO(dmaretskyi): Should we error if sending data has errored?
        callback();
      },
      read: () => {} // No-op. We will push data when we receive it.
    });

    channel.push = (data) => {
      stream.push(data);
    };
    channel.destroy = (err) => {
      stream.destroy(err);
    };

    // NOTE: Make sure channel.push is set before sending the command.
    this._sendCommand({
      openChannel: {
        id: channel.id,
        tag: channel.tag,
        contentType: channel.contentType
      }
    });

    return stream;
  }

  /**
   * Creates an RPC port.
   * The remote peer is expected to call `createPort` with the same tag.
   * The port is immediately usable.
   * NOTE: The data will be buffered until the stream is opened remotely with the same tag (may cause a memory leak).
   */
  createPort(tag: string, opts: CreateChannelOpts = {}): RpcPort {
    const channel = this._getOrCreateStream({
      tag,
      contentType: opts.contentType
    });
    assert(!channel.push, `Channel already open: ${tag}`);

    // We need to buffer incoming data until the port is subscribed to.
    let inboundBuffer: Uint8Array[] = [];
    let callback: ((data: Uint8Array) => void) | undefined;

    channel.push = (data) => {
      if (callback) {
        callback(data);
      } else {
        inboundBuffer.push(data);
      }
    };

    const port: RpcPort = {
      send: (data: Uint8Array) => {
        this._sendData(channel, data); // TODO(dmaretskyi): Error propagation?
      },
      subscribe: (cb: (data: Uint8Array) => void) => {
        assert(!callback, 'Only one subscriber is allowed');
        callback = cb;
        for (const data of inboundBuffer) {
          cb(data);
        }
        inboundBuffer = [];
      }
    };

    // NOTE: Make sure channel.push is set before sending the command.
    this._sendCommand({
      openChannel: {
        id: channel.id,
        tag: channel.tag,
        contentType: channel.contentType
      }
    });

    return port;
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

    for (const channel of this._channelsByTag.values()) {
      channel.destroy?.(err);
    }

    this.close.emit(err);

    // Make it easy for GC.
    this._channelsByLocalId.clear();
    this._channelsByTag.clear();
  }

  private _handleCommand(cmd: Command) {
    log('Received command', { cmd });

    if (this._destroyed || this._destroying) {
      log.warn('Received command after destroy');
      return;
    }

    if (cmd.openChannel) {
      const channel = this._getOrCreateStream({
        tag: cmd.openChannel.tag,
        contentType: cmd.openChannel.contentType
      });
      channel.remoteId = cmd.openChannel.id;

      // Flush any buffered data.
      for (const data of channel.buffer) {
        this._sendCommand({
          data: {
            channelId: channel.remoteId,
            data
          }
        });
      }
      channel.buffer = [];
    } else if (cmd.data) {
      const stream = this._channelsByLocalId.get(cmd.data.channelId) ?? failUndefined();
      if (!stream.push) {
        log.warn('Received data for channel before it was opened', { tag: stream.tag });
        return;
      }
      stream.push(cmd.data.data);
    } else if (cmd.destroy) {
      this._dispose();
    }
  }

  private _sendCommand(cmd: Command) {
    Promise.resolve(this._framer.port.send(codec.encode(cmd))).catch((err) => {
      this.destroy(err);
    });
  }

  private _getOrCreateStream(params: CreateChannelInternalParams): Channel {
    let channel = this._channelsByTag.get(params.tag);
    if (!channel) {
      channel = {
        id: this._nextId++,
        remoteId: null,
        tag: params.tag,
        contentType: params.contentType,
        buffer: [],
        push: null,
        destroy: null
      };
      this._channelsByTag.set(channel.tag, channel);
      this._channelsByLocalId.set(channel.id, channel);
    }
    return channel;
  }

  private _sendData(channel: Channel, data: Uint8Array) {
    if (channel.remoteId === null) {
      // Remote side has not opened the channel yet.
      channel.buffer.push(data);
    } else {
      this._sendCommand({
        data: {
          channelId: channel.remoteId,
          data
        }
      });
    }
  }
}

type Channel = {
  /**
   * Our local channel ID.
   * Incoming Data commands will have this ID.
   */
  id: number;
  tag: string;

  /**
   * Remote id is set when we receive an OpenChannel command.
   * The originating Data commands should carry this id.
   */
  remoteId: null | number;

  contentType?: string;

  /**
   * Send buffer.
   */
  buffer: Uint8Array[];

  /**
   * Set when we initialize a NodeJS stream or an RPC port consuming the channel.
   */
  push: null | ((data: Uint8Array) => void);

  destroy: null | ((err?: Error) => void);
};

type CreateChannelInternalParams = {
  tag: string;
  contentType?: string;
};
