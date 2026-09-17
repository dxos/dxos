//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { randomBytes } from 'node:crypto';

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type BufService, getBufService } from '@dxos/protocols/buf-service';
import {
  TestRpcRequestSchema,
  TestRpcResponseSchema,
  TestServiceWithStreams as TestServiceWithStreamsDesc,
  TestStreamRpcRequestSchema,
  TestStreamRpcResponseSchema,
} from '@dxos/protocols/buf/example/testing/rpc_pb';
import { type ProtoRpcPeer, createProtoRpcPeer } from '@dxos/rpc';

import { type DuplexStream, readAll } from '../muxing/index.ts';
import { type ExtensionContext, type TeleportExtension } from '../teleport.ts';

type TestServiceWithStreams = BufService<typeof TestServiceWithStreamsDesc>;

interface TestExtensionWithStreamsCallbacks {
  onOpen?: () => Promise<void>;
  onClose?: () => Promise<void>;
  onAbort?: () => Promise<void>;
}

export class TestExtensionWithStreams implements TeleportExtension {
  public readonly open = new Trigger();
  public readonly closed = new Trigger();
  public readonly aborted = new Trigger();
  private readonly _streams = new Map<string, TestStream>();

  public extensionContext: ExtensionContext | undefined;
  private _rpc!: ProtoRpcPeer<{ TestServiceWithStreams: TestServiceWithStreams }>;

  constructor(public readonly callbacks: TestExtensionWithStreamsCallbacks = {}) {}

  get remotePeerId() {
    return this.extensionContext?.remotePeerId;
  }

  private async _openStream(streamTag: string, interval = 5, chunkSize = 2048): Promise<void> {
    invariant(!this._streams.has(streamTag), `Stream already exists: ${streamTag}`);

    const networkStream = await this.extensionContext!.createStream(streamTag, {
      contentType: 'application/x-test-stream',
    });

    const streamEntry: TestStream = {
      networkStream,
      abort: new AbortController(),
      bytesSent: 0,
      bytesReceived: 0,
      sendErrors: 0,
      receiveErrors: 0,
      startTimestamp: Date.now(),
    };

    const writer = networkStream.writable.getWriter();
    streamEntry.writer = writer;

    const pushChunk = () => {
      if (streamEntry.closed) {
        return;
      }

      streamEntry.timer = setTimeout(() => {
        if (streamEntry.closed) {
          return;
        }

        const chunk = randomBytes(chunkSize);
        writer
          .write(chunk)
          .then(() => {
            streamEntry.bytesSent += chunk.length;
          })
          .catch(() => {
            streamEntry.sendErrors += 1;
          });
        // `ready` settles once the sink wants more, which is what paces this loop.
        void writer.ready.then(pushChunk).catch(() => {});
      }, interval);
    };

    pushChunk();

    this._streams.set(streamTag, streamEntry);

    void readAll(
      networkStream.readable,
      (data) => {
        streamEntry.bytesReceived += data.length;
      },
      { signal: streamEntry.abort.signal },
    ).catch(() => {
      streamEntry.receiveErrors += 1;
    });

    streamEntry.reportingTimer = setInterval(() => {
      const { bytesSent, bytesReceived, sendErrors, receiveErrors } = streamEntry;
      // log.info('stream stats', { streamTag, bytesSent, bytesReceived, sendErrors, receiveErrors });
      log.trace('dxos.test.stream-stats', {
        streamTag,
        bytesSent,
        bytesReceived,
        sendErrors,
        receiveErrors,
        from: this.extensionContext?.localPeerId,
        to: this.extensionContext?.remotePeerId,
      });
    }, 100);
  }

  private _closeStream(streamTag: string): Stats {
    invariant(this._streams.has(streamTag), `Stream does not exist: ${streamTag}`);

    const stream = this._streams.get(streamTag)!;

    clearTimeout(stream.timer);
    clearTimeout(stream.reportingTimer);

    const { bytesSent, bytesReceived, sendErrors, receiveErrors, startTimestamp } = stream;

    destroyTestStream(stream);
    this._streams.delete(streamTag);

    return {
      bytesSent,
      bytesReceived,
      sendErrors,
      receiveErrors,
      runningTime: Date.now() - (startTimestamp ?? 0),
    };
  }

  async onOpen(context: ExtensionContext): Promise<void> {
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
        TestServiceWithStreams: getBufService<TestServiceWithStreams>('example.testing.rpc.TestServiceWithStreams'),
      },
      exposed: {
        TestServiceWithStreams: getBufService<TestServiceWithStreams>('example.testing.rpc.TestServiceWithStreams'),
      },
      handlers: {
        TestServiceWithStreams: {
          requestTestStream: async (request) => {
            const { data: streamTag, streamLoadInterval, streamLoadChunkSize } = request;

            await this._openStream(streamTag, streamLoadInterval, streamLoadChunkSize);

            return create(TestRpcResponseSchema, { data: streamTag });
          },
          closeTestStream: async (request) => {
            const streamTag = request.data;
            const { bytesSent, bytesReceived, sendErrors, receiveErrors, runningTime } = this._closeStream(streamTag);

            return create(TestStreamRpcResponseSchema, {
              data: streamTag,
              bytesSent,
              bytesReceived,
              sendErrors,
              receiveErrors,
              runningTime,
            });
          },
        },
      },
      timeout: 2000,
    });

    await this._rpc.open();
    await this.callbacks.onOpen?.();

    this.open.wake();
  }

  async onClose(err?: Error): Promise<void> {
    log('onClose', { err });
    await this.callbacks.onClose?.();
    this.closed.wake();
    for (const [streamTag, stream] of this._streams) {
      log('closing stream', { streamTag });
      destroyTestStream(stream);
    }
    this._streams.clear();
    await this._rpc?.close();
  }

  async onAbort(err?: Error): Promise<void> {
    log('onAbort', { err });
    await this.callbacks.onAbort?.();
    this.aborted.wake();
    await this._rpc?.abort();
  }

  async addNewStream(streamLoadInterval: number, streamLoadChunkSize: number, streamTag?: string): Promise<string> {
    await this.open.wait({ timeout: 1500 });
    if (!streamTag) {
      streamTag = `stream-${randomBytes(4).toString('hex')}`;
    }
    const { data } = await this._rpc.rpc.TestServiceWithStreams.requestTestStream(
      create(TestStreamRpcRequestSchema, { data: streamTag, streamLoadInterval, streamLoadChunkSize }),
    );
    invariant(data === streamTag);

    await this._openStream(streamTag, streamLoadInterval, streamLoadChunkSize);
    return streamTag;
  }

  async closeStream(streamTag: string): Promise<TestStreamStats> {
    await this.open.wait({ timeout: 1500 });
    const { data, bytesSent, bytesReceived, sendErrors, receiveErrors, runningTime } =
      await this._rpc.rpc.TestServiceWithStreams.closeTestStream(create(TestRpcRequestSchema, { data: streamTag }));

    invariant(data === streamTag);

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
  async closeConnection(err?: Error): Promise<void> {
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
  networkStream: DuplexStream;
  abort: AbortController;
  writer?: WritableStreamDefaultWriter<Uint8Array>;
  bytesSent: number;
  bytesReceived: number;
  sendErrors: number;
  receiveErrors: number;
  timer?: NodeJS.Timeout;
  closed?: boolean;
  startTimestamp?: number;
  reportingTimer?: NodeJS.Timeout;
};

const destroyTestStream = (stream: TestStream): void => {
  // The push loop reschedules itself off `writer.ready`, so it has to be told to stop; closing the
  // writer alone leaves a timer running for the rest of the process.
  stream.closed = true;
  clearTimeout(stream.timer);
  clearInterval(stream.reportingTimer);
  void stream.writer?.close().catch(() => {});
  // Through the read loop's own reader: `readable.cancel()` fails while `readAll` holds the lock.
  stream.abort.abort();
};
