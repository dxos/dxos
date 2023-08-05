//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { randomBytes } from 'node:crypto';
import { Duplex } from 'node:stream';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { TestServiceWithStreams } from '@dxos/protocols/proto/example/testing/rpc';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';

import { ExtensionContext, TeleportExtension } from '../teleport';

interface TestExtensionWithStreamsCallbacks {
  onOpen?: () => Promise<void>;
  onClose?: () => Promise<void>;
}

export class TestExtensionWithStreams implements TeleportExtension {
  public readonly open = new Trigger();
  public readonly closed = new Trigger();
  private readonly _streams = new Map<string, TestStream>();

  public extensionContext: ExtensionContext | undefined;
  private _rpc!: ProtoRpcPeer<{ TestServiceWithStreams: TestServiceWithStreams }>;

  constructor(public readonly callbacks: TestExtensionWithStreamsCallbacks = {}) {}

  get remotePeerId() {
    return this.extensionContext?.remotePeerId;
  }

  private async _openStream(streamTag: string, interval = 5, chunkSize = 2048) {
    assert(!this._streams.has(streamTag), `Stream already exists: ${streamTag}`);

    const networkStream = await this.extensionContext!.createStream(streamTag, {
      contentType: 'application/x-test-stream',
    });

    const streamEntry: TestStream = {
      networkStream,
      bytesSent: 0,
      bytesReceived: 0,
      sendErrors: 0,
      receiveErrors: 0,
      startTimestamp: Date.now(),
    };

    const pushChunk = () => {
      streamEntry.timer = setTimeout(() => {
        const chunk = randomBytes(chunkSize);

        if (
          !networkStream.write(chunk, 'binary', (err) => {
            if (!err) {
              streamEntry.bytesSent += chunk.length;
            } else {
              streamEntry.sendErrors += 1;
            }
          })
        ) {
          networkStream.once('drain', pushChunk);
        } else {
          process.nextTick(pushChunk);
        }
      }, interval);
    };

    pushChunk();

    this._streams.set(streamTag, streamEntry);

    networkStream.on('data', (data) => {
      streamEntry.bytesReceived += data.length;
    });

    networkStream.on('error', (err) => {
      streamEntry.receiveErrors += 1;
    });

    networkStream.on('close', () => {
      networkStream.removeAllListeners();
    });
  }

  private _closeStream(streamTag: string): Stats {
    assert(this._streams.has(streamTag), `Stream does not exist: ${streamTag}`);

    const stream = this._streams.get(streamTag)!;

    clearTimeout(stream.timer);

    const { bytesSent, bytesReceived, sendErrors, receiveErrors, startTimestamp } = stream;

    stream.networkStream.destroy();
    this._streams.delete(streamTag);

    return {
      bytesSent,
      bytesReceived,
      sendErrors,
      receiveErrors,
      runningTime: Date.now() - (startTimestamp ?? 0),
    };
  }

  async onOpen(context: ExtensionContext) {
    log('onOpen', { localPeerId: context.localPeerId, remotePeerId: context.remotePeerId });
    this.extensionContext = context;
    this._rpc = createProtoRpcPeer<
      { TestServiceWithStreams: TestServiceWithStreams },
      { TestServiceWithStreams: TestServiceWithStreams }
    >({
      port: await context.createPort('rpc', {
        contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"',
      }),
      requested: {
        TestServiceWithStreams: schema.getService('example.testing.rpc.TestServiceWithStreams'),
      },
      exposed: {
        TestServiceWithStreams: schema.getService('example.testing.rpc.TestServiceWithStreams'),
      },
      handlers: {
        TestServiceWithStreams: {
          requestTestStream: async (request) => {
            const { data: streamTag, streamLoadInterval, streamLoadChunkSize } = request;

            await this._openStream(streamTag, streamLoadInterval, streamLoadChunkSize);

            return {
              data: streamTag,
            };
          },
          closeTestStream: async (request) => {
            const streamTag = request.data;
            const { bytesSent, bytesReceived, sendErrors, receiveErrors, runningTime } = this._closeStream(streamTag);

            return {
              data: streamTag,
              bytesSent,
              bytesReceived,
              sendErrors,
              receiveErrors,
              runningTime,
            };
          },
        },
      },
      timeout: 2000,
    });

    await this._rpc.open();
    await this.callbacks.onOpen?.();

    this.open.wake();
  }

  async onClose(err?: Error) {
    log('onClose', { err });
    await this.callbacks.onClose?.();
    this.closed.wake();
    for (const [streamTag, stream] of Object.entries(this._streams)) {
      log('closing stream', { streamTag });
      clearTimeout(stream.interval);
      stream.networkStream.destroy();
    }
    await this._rpc?.close();
  }

  async addNewStream(streamLoadInterval: number, streamLoadChunkSize: number, streamTag?: string): Promise<string> {
    await this.open.wait({ timeout: 1500 });
    if (!streamTag) {
      streamTag = `stream-${randomBytes(4).toString('hex')}`;
    }
    const { data } = await this._rpc.rpc.TestServiceWithStreams.requestTestStream({
      data: streamTag,
      streamLoadInterval,
      streamLoadChunkSize,
    });
    assert(data === streamTag);

    await this._openStream(streamTag, streamLoadInterval, streamLoadChunkSize);
    return streamTag;
  }

  async closeStream(streamTag: string): Promise<TestStreamStats> {
    await this.open.wait({ timeout: 1500 });
    const { data, bytesSent, bytesReceived, sendErrors, receiveErrors, runningTime } =
      await this._rpc.rpc.TestServiceWithStreams.closeTestStream({
        data: streamTag,
      });

    assert(data === streamTag);

    const local = this._closeStream(streamTag);

    return {
      streamTag,
      stats: {
        local,
        remote: {
          bytesSent,
          bytesReceived,
          sendErrors,
          receiveErrors,
          runningTime,
        },
      },
    };
  }

  /**
   * Force-close the connection.
   */
  async closeConnection(err?: Error) {
    this.extensionContext?.close(err);
  }
}

type Stats = {
  bytesSent: number;
  bytesReceived: number;
  sendErrors: number;
  receiveErrors: number;
  runningTime: number;
};

export type TestStreamStats = {
  streamTag: string;
  stats: {
    local: Stats;
    remote: Stats;
  };
};

type TestStream = {
  networkStream: Duplex;
  bytesSent: number;
  bytesReceived: number;
  sendErrors: number;
  receiveErrors: number;
  timer?: NodeJS.Timer;
  startTimestamp?: number;
};
