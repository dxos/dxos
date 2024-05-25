//
// Copyright 2022 DXOS.org
//

import { Duplex } from 'node:stream';

import { scheduleTaskInterval, Event, Trigger, asyncTimeout } from '@dxos/async';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import { schema, TimeoutError } from '@dxos/protocols';
import { type ConnectionInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { type Command } from '@dxos/protocols/proto/dxos/mesh/muxer';

import { Balancer } from './balancer';
import { type RpcPort } from './rpc-port';

const Command = schema.getCodecForType('dxos.mesh.muxer.Command');

const DEFAULT_SEND_COMMAND_TIMEOUT = 60_000;
const DESTROY_COMMAND_SEND_TIMEOUT = 5_000;

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
  readBufferSize?: number;
  writeBufferSize?: number;
};

const STATS_INTERVAL = 1_000;
const MAX_SAFE_FRAME_SIZE = 1_000_000;
const SYSTEM_CHANNEL_ID = 0;
const GRACEFUL_CLOSE_TIMEOUT = 3_000;

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
  private _sessionId?: PublicKey;

  private _nextId = 1;

  private _closing = false;
  private _destroying = false;
  private _disposed = false;

  private _lastStats?: MuxerStats = undefined;
  private readonly _lastChannelStats = new Map<number, Channel['stats']>();

  public afterClosed = new Event<Error | undefined>();
  public statsUpdated = new Event<MuxerStats>();

  public readonly stream = this._balancer.stream;

  constructor() {
    // Add a channel for control messages.
    this._balancer.incomingData.on(async (msg) => {
      await this._handleCommand(Command.decode(msg));
    });
  }

  setSessionId(sessionId: PublicKey) {
    this._sessionId = sessionId;
  }

  @logInfo
  get sessionIdString(): string {
    return this._sessionId ? this._sessionId.truncate() : 'none';
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
      if (err) {
        if (stream.listeners('error').length > 0) {
          stream.destroy(err);
        } else {
          stream.destroy();
        }
      } else {
        stream.destroy();
      }
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
      send: async (data: Uint8Array, timeout?: number) => {
        await this._sendData(channel, data, timeout);
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

  // initiate graceful close

  async close(err?: Error) {
    if (this._destroying) {
      log('already destroying, ignoring graceful close request');
      return;
    }
    if (this._closing) {
      log('already closing, ignoring graceful close request');
      return;
    }

    this._closing = true;

    await this._sendCommand(
      {
        close: {
          error: err?.message,
        },
      },
      SYSTEM_CHANNEL_ID,
      DESTROY_COMMAND_SEND_TIMEOUT,
    ).catch(async (err: any) => {
      log('error sending close command', { err });

      await this._dispose(err);
    });

    // don't return until close is complete or timeout
    await asyncTimeout(this._dispose(err), GRACEFUL_CLOSE_TIMEOUT, new TimeoutError('gracefully closing muxer'));
  }

  // force close without confirmation

  async destroy(err?: Error) {
    if (this._destroying) {
      log('already destroying, ignoring destroy request');
      return;
    }
    this._destroying = true;
    void this._ctx.dispose();
    if (this._closing) {
      log('destroy cancelling graceful close');
      this._closing = false;
    } else {
      // as a courtesy to the peer, send destroy command but ignore errors sending

      await this._sendCommand(
        {
          close: {
            error: err?.message,
          },
        },
        SYSTEM_CHANNEL_ID,
      ).catch(async (err: any) => {
        log('error sending courtesy close command', { err });
      });
    }

    this._dispose(err).catch((err) => {
      log('error disposing after destroy', { err });
    });
  }

  // complete the termination, graceful or otherwise

  async _dispose(err?: Error) {
    if (this._disposed) {
      log('already destroyed, ignoring dispose request');
      return;
    }

    void this._ctx.dispose();

    await this._balancer.destroy();

    for (const channel of this._channelsByTag.values()) {
      channel.destroy?.(err);
    }
    this._disposed = true;
    await this._emitStats();

    this.afterClosed.emit(err);

    // Make it easy for GC.
    this._channelsByLocalId.clear();
    this._channelsByTag.clear();
  }

  private async _handleCommand(cmd: Command) {
    if (this._disposed) {
      log.warn('Received command after disposed', { cmd });
      return;
    }

    if (cmd.close) {
      if (!this._closing) {
        log('received peer close, initiating my own graceful close');
        await this.close(new Error('received peer close'));
      } else {
        log('received close from peer, already closing');
      }

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
    }
  }

  private async _sendCommand(cmd: Command, channelId = -1, timeout = DEFAULT_SEND_COMMAND_TIMEOUT) {
    if (this._disposed) {
      log.info('ignoring sendCommand after disposed', { cmd });
      return;
    }
    try {
      const trigger = new Trigger<void>();
      this._balancer.pushData(Command.encode(cmd), trigger, channelId);
      await trigger.wait({ timeout });
    } catch (err: any) {
      await this.destroy(err);
    }
  }

  private _getOrCreateStream(params: CreateChannelInternalParams): Channel {
    if (this._channelsByTag.size === 0) {
      scheduleTaskInterval(this._ctx, async () => this._emitStats(), STATS_INTERVAL);
    }
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

  private async _sendData(channel: Channel, data: Uint8Array, timeout?: number): Promise<void> {
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
      timeout,
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
    if (this._disposed || this._destroying) {
      if (!this._lastStats) {
        return;
      }

      // zero out counting stats to not skew metrics.
      const lastStats = this._lastStats;
      this._lastStats = undefined;

      lastStats.readBufferSize = 0;
      lastStats.writeBufferSize = 0;
      for (const c of lastStats.channels) {
        c.writeBufferSize = 0;
      }
      this.statsUpdated.emit(lastStats);

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
          writeBufferSize: channel.buffer.length,
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
      readBufferSize: this._balancer.stream.readableLength,
      writeBufferSize: this._balancer.stream.writableLength,
    };

    this.statsUpdated.emit(this._lastStats);
  }
}
