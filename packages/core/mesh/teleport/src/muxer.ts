//
// Copyright 2022 DXOS.org
//

import { failUndefined, todo } from '@dxos/debug';
import { schema } from '@dxos/protocols';
import { Command } from '@dxos/protocols/dist/src/proto/gen/dxos/teleport';
import assert from 'assert';
import { Channel, CreateStreamOpts, StreamHandle } from './channel';
import { Framer } from './framer';

const codec = schema.getCodecForType('dxos.teleport.Command');

export type CleanupCb = void | (() => void);

export class Muxer {
  private readonly _framer = new Framer()
  public readonly stream = this._framer.stream;

  private readonly _channels = new Map<string, Channel>();
  private readonly _remoteChannels = new Set<string>();
  private readonly _streamsByRemoteId = new Map<number, StreamHandle>();

  private _nextId = 0;

  constructor() {
    this._framer.port.subscribe(msg => {
      this._handleCommand(codec.decode(msg));
    })
  }

  createChannel(tag: string, onOpen: (channel: Channel) => CleanupCb) {
    assert(!this._channels.has(tag), `Channel already exists: ${tag}`);

    const channel: Channel = new Channel(tag, onOpen, (tag, opts) => this._getOrCreateStream(channel, tag, opts), (streamId, data) => {
      this._sendCommand({
        data: { streamId, data },
      }) 
    });

    this._channels.set(tag, channel);

    this._sendCommand({
      advertizeChannel: { tag }
    })
  }

  /**
   * Graceful close.
   */
  finalize() {}

  /**
   * Force-close with optional error.
   */
  destroy(err?: Error) {}

  private _handleCommand(cmd: Command) {
    if(cmd.advertizeChannel) {
      this._remoteChannels.add(cmd.advertizeChannel.tag);

      const localChannel = this._channels.get(cmd.advertizeChannel.tag)
      if(localChannel) {
        this._openChannel(cmd.advertizeChannel.tag);
      }
    } else if(cmd.openChannel) {
      this._openChannel(cmd.openChannel.tag);
    } else if(cmd.openStream) {
      const channel = this._channels.get(cmd.openStream.channel) ?? failUndefined();
      const stream = this._getOrCreateStream(channel, cmd.openStream.tag, { contentType: cmd.openStream.contentType });
      stream.remoteId = cmd.openStream.id;
      this._streamsByRemoteId.set(cmd.openStream.id, stream);
    } else if(cmd.data) {
      const stream = this._streamsByRemoteId.get(cmd.data.streamId) ?? failUndefined();
      if(stream.push) {
        stream.push(cmd.data.data);
      } else {
        stream.buffer.push(cmd.data.data);
      }
    } else if(cmd.finalize) {
      todo()
    } else if(cmd.destroy) {
      todo()
    }
  }

  private _sendCommand(cmd: Command) {
    this._framer.port.send(codec.encode(cmd));
  }

  private _openChannel(tag: string) {
    const channel = this._channels.get(tag) ?? failUndefined();

    if(!channel.isOpen) {
      channel.open()

      this._sendCommand({
        openChannel: { tag },
      })
    }
  }

  private _getOrCreateStream(channel: Channel, tag: string, opts: CreateStreamOpts) {
    let stream = channel.streams.get(tag);
    if(!stream) {
      stream = {
        id: this._nextId++,
        tag: tag,
        contentType: opts.contentType,
        channel,
        buffer: [],
      }
      channel.streams.set(tag, stream);
      this._sendCommand({ openStream: { 
        id: stream.id,
        tag: tag,
        channel: channel.tag,
        contentType: opts.contentType,
      }})
    }
    return stream;
  }
}
