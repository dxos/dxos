//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { Duplex } from 'node:stream';

import { Trigger, synchronized } from '@dxos/async';
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

  public extensionContext: ExtensionContext | undefined;
  private _rpc!: ProtoRpcPeer<{ TestServiceWithStreams: TestServiceWithStreams }>;

  private readonly _streams = new Map<string, TestStream>();

  constructor(public readonly callbacks: TestExtensionWithStreamsCallbacks = {}) {}

  get remotePeerId() {
    return this.extensionContext?.remotePeerId;
  }

  @synchronized
  private _loadStream(streamTag: string) {
    assert(!this._streams.has(streamTag), `Stream ${streamTag} already exists.`);

    const networkStream = this.extensionContext!.createStream(streamTag, {
      contentType: 'application/x-test-stream',
    });

    const interval = setInterval(() => {
      const data = Buffer.alloc(1024);
      networkStream.write(data);
    }, 500);

    this._streams.set(streamTag, { networkStream, interval });
  }

  async onOpen(context: ExtensionContext) {
    log('onOpen', { localPeerId: context.localPeerId, remotePeerId: context.remotePeerId });
    this.extensionContext = context;
    this._rpc = createProtoRpcPeer<
      { TestServiceWithStreams: TestServiceWithStreams },
      { TestServiceWithStreams: TestServiceWithStreams }
    >({
      port: context.createPort('rpc', {
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
            const streamTag = request.data;

            this._loadStream(streamTag);

            return {
              data: streamTag,
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
    for (const stream of this._streams.values()) {
      clearInterval(stream.interval);
      stream.networkStream.destroy();
    }
    await this._rpc?.close();
  }

  async addNewStream() {
    await this.open.wait({ timeout: 1500 });
    const streamTag = `stream-${this._streams.size}`;
    const { data } = await this._rpc.rpc.TestServiceWithStreams.requestTestStream({ data: streamTag });
    assert(data === streamTag);

    this._loadStream(streamTag);
  }

  /**
   * Force-close the connection.
   */
  async closeConnection(err?: Error) {
    this.extensionContext?.close(err);
  }
}

type TestStream = {
  networkStream: Duplex;
  interval: NodeJS.Timer;
};
