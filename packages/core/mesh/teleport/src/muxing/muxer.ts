//
// Copyright 2022 DXOS.org
//

import { Duplex } from 'node:stream';

import { scheduleTaskInterval, Event, Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { type ConnectionInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { Command } from '@dxos/protocols/proto/dxos/mesh/muxer';

import { Balancer } from './balancer';
import { type RpcPort } from './rpc-port';

const Command = schema.getCodecForType('dxos.mesh.muxer.Command');

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

export type MuxerStats = {
  timestamp: number;
  channels: ConnectionInfo.StreamStats[];
  bytesSent: number;
  bytesReceived: number;
  bytesSentRate?: number;
  bytesReceivedRate?: number;
};

const STATS_INTERVAL = 1_000;
const MAX_SAFE_FRAME_SIZE = 1_000_000;
const SYSTEM_CHANNEL_ID = 0;

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

  stats: {
    bytesSent: number;
    bytesReceived: number;
  };
};

type CreateChannelInternalParams = {
  tag: string;
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
  private readonly _balancer = new Balancer(SYSTEM_CHANNEL_ID);
  private readonly _channelsByLocalId = new Map<number, Channel>();
  private readonly _channelsByTag = new Map<string, Channel>();
  private readonly _ctx = new Context();

  private _nextId = 1;
  private _destroyed = false;
  private _destroying = false;

  private _lastStats?: MuxerStats = undefined;
  private readonly _lastChannelStats = new Map<number, Channel['stats']>();

  public close = new Event<Error | undefined>();
  public statsUpdated = new Event<MuxerStats>();

  public readonly stream = this._balancer.stream;

  constructor() {
    // Add a channel for control messages.
    this._balancer.incomingData.on(async (msg) => {
      await this._handleCommand(Command.decode(msg));
    });

    scheduleTaskInterval(this._ctx, async () => this._emitStats(), STATS_INTERVAL);
  }

  /**
   * Creates a duplex Node.js-style stream.
   * The remote peer is expected to call `createStream` with the same tag.
   * The stream is immediately readable and writable.
   * NOTE: The data will be buffered until the stream is opened remotely with the same tag (may cause a memory leak).
   */
  async createStream(tag: string, opts: CreateChannelOpts = {}): Promise<Duplex> {
    const channel = this._getOrCreateStream({
      tag,
      contentType: opts.contentType,
    });
    invariant(!channel.push, `Channel already open: ${tag}`);

    const stream = new Duplex({
      write: (data, encoding, callback) => {
        this._sendData(channel, data)
          .then(() => callback())
          .catch(callback);
        // TODO(dmaretskyi): Should we error if sending data has errored?
      },
      read: () => {}, // No-op. We will push data when we receive it.
    });

    channel.push = (data) => {
      channel.stats.bytesReceived += data.length;
      stream.push(data);
    };
    channel.destroy = (err) => {
      // TODO(dmaretskyi): Call stream.end() instead?
      stream.destroy(err);
    };

    // NOTE: Make sure channel.push is set before sending the command.
    try {
      await this._sendCommand(
        {
          openChannel: {
            id: channel.id,
            tag: channel.tag,
            contentType: channel.contentType,
          },
        },
        SYSTEM_CHANNEL_ID,
      );
    } catch (err: any) {
      this._destroyChannel(channel, err);
      throw err;
    }

    return stream;
  }

  /**
   * Creates an RPC port.
   * The remote peer is expected to call `createPort` with the same tag.
   * The port is immediately usable.
   * NOTE: The data will be buffered until the stream is opened remotely with the same tag (may cause a memory leak).
   */
  async createPort(tag: string, opts: CreateChannelOpts = {}): Promise<RpcPort> {
    const channel = this._getOrCreateStream({
      tag,
      contentType: opts.contentType,
    });
    invariant(!channel.push, `Channel already open: ${tag}`);

    // We need to buffer incoming data until the port is subscribed to.
    let inboundBuffer: Uint8Array[] = [];
    let callback: ((data: Uint8Array) => void) | undefined;

    channel.push = (data) => {
      channel.stats.bytesReceived += data.length;
      if (callback) {
        callback(data);
      } else {
        inboundBuffer.push(data);
      }
    };

    const port: RpcPort = {
      send: async (data: Uint8Array) => {
        await this._sendData(channel, data);
        // TODO(dmaretskyi): Debugging.
        // appendFileSync('log.json', JSON.stringify(schema.getCodecForType('dxos.rpc.RpcMessage').decode(data), null, 2) + '\n')
      },
      subscribe: (cb: (data: Uint8Array) => void) => {
        invariant(!callback, 'Only one subscriber is allowed');
        callback = cb;
        for (const data of inboundBuffer) {
          cb(data);
        }
        inboundBuffer = [];
      },
    };

    // NOTE: Make sure channel.push is set before sending the command.
    try {
      await this._sendCommand(
        {
          openChannel: {
            id: channel.id,
            tag: channel.tag,
            contentType: channel.contentType,
          },
        },
        SYSTEM_CHANNEL_ID,
      );
    } catch (err: any) {
      this._destroyChannel(channel, err);
      throw err;
    }

    return port;
  }

  /**
   * Force-close with optional error.
   */
  async destroy(err?: Error) {
    if (this._destroying) {
      return;
    }
    this._destroying = true;

    this._sendCommand(
      {
        destroy: {
          error: err?.message,
        },
      },
      SYSTEM_CHANNEL_ID,
    )
      .then(() => {
        this._dispose();
      })
      .catch((err: any) => {
        this._dispose(err);
      });

    void this._ctx.dispose();
  }

  private _dispose(err?: Error) {
    if (this._destroyed) {
      return;
    }

    this._destroyed = true;
    this._balancer.destroy();

    for (const channel of this._channelsByTag.values()) {
      channel.destroy?.(err);
    }

    this.close.emit(err);

    // Make it easy for GC.
    this._channelsByLocalId.clear();
    this._channelsByTag.clear();
  }

  private async _handleCommand(cmd: Command) {
    log('Received command', { cmd });

    if (this._destroyed || this._destroying) {
      if (cmd.destroy) {
        return;
      }

      log.warn('Received command after destroy', { cmd });
      return;
    }

    if (cmd.openChannel) {
      const channel = this._getOrCreateStream({
        tag: cmd.openChannel.tag,
        contentType: cmd.openChannel.contentType,
      });
      channel.remoteId = cmd.openChannel.id;

      // Flush any buffered data.
      for (const data of channel.buffer) {
        await this._sendCommand(
          {
            data: {
              channelId: channel.remoteId!,
              data,
            },
          },
          channel.id,
        );
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

  private async _sendCommand(cmd: Command, channelId = -1) {
    try {
      const trigger = new Trigger<void>();
      this._balancer.pushData(Command.encode(cmd), trigger, channelId);
      await trigger.wait();
    } catch (err: any) {
      await this.destroy(err);
    }
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
        destroy: null,
        stats: {
          bytesSent: 0,
          bytesReceived: 0,
        },
      };
      this._channelsByTag.set(channel.tag, channel);
      this._channelsByLocalId.set(channel.id, channel);
      this._balancer.addChannel(channel.id);
    }

    return channel;
  }

  private async _sendData(channel: Channel, data: Uint8Array): Promise<void> {
    if (data.length > MAX_SAFE_FRAME_SIZE) {
      log.warn('frame size exceeds maximum safe value', { size: data.length, threshold: MAX_SAFE_FRAME_SIZE });
    }

    channel.stats.bytesSent += data.length;
    if (channel.remoteId === null) {
      // Remote side has not opened the channel yet.
      channel.buffer.push(data);
      return;
    }
    await this._sendCommand(
      {
        data: {
          channelId: channel.remoteId,
          data,
        },
      },
      channel.id,
    );
  }

  private _destroyChannel(channel: Channel, err?: Error) {
    if (channel.destroy) {
      channel.destroy(err);
    }

    this._channelsByLocalId.delete(channel.id);
    this._channelsByTag.delete(channel.tag);
  }

  private async _emitStats() {
    if (this._destroyed || this._destroying) {
      this._lastStats = undefined;
      this._lastChannelStats.clear();
      return;
    }

    const bytesSent = this._balancer.bytesSent;
    const bytesReceived = this._balancer.bytesReceived;

    const now = Date.now();
    const interval = this._lastStats ? (now - this._lastStats.timestamp) / 1_000 : 0;
    const calculateThroughput = (current: Channel['stats'], last: Channel['stats'] | undefined) =>
      last
        ? {
            bytesSentRate: interval ? (current.bytesSent - last.bytesSent) / interval : undefined,
            bytesReceivedRate: interval ? (current.bytesReceived - last.bytesReceived) / interval : undefined,
          }
        : {};

    this._lastStats = {
      timestamp: now,
      channels: Array.from(this._channelsByTag.values()).map((channel) => {
        const stats: ConnectionInfo.StreamStats = {
          id: channel.id,
          tag: channel.tag,
          contentType: channel.contentType,
          bytesSent: channel.stats.bytesSent,
          bytesReceived: channel.stats.bytesReceived,
          ...calculateThroughput(channel.stats, this._lastChannelStats.get(channel.id)),
        };

        this._lastChannelStats.set(channel.id, stats);
        return stats;
      }),
      bytesSent,
      bytesReceived,
      ...calculateThroughput({ bytesSent, bytesReceived }, this._lastStats),
    };

    this.statsUpdated.emit(this._lastStats);
  }
}
