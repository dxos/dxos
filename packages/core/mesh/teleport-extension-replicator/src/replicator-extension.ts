//
// Copyright 2022 DXOS.org
//

import type { ProtocolStream } from 'hypercore-protocol';
import { type Duplex } from 'node:stream';

import { asyncTimeout, DeferredTask, synchronized } from '@dxos/async';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { type FeedWrapper } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import { schema, RpcClosedError, TimeoutError } from '@dxos/protocols';
import { type FeedInfo, type ReplicatorService } from '@dxos/protocols/proto/dxos/mesh/teleport/replicator';
import { createProtoRpcPeer, type ProtoRpcPeer } from '@dxos/rpc';
import { type ExtensionContext, type TeleportExtension } from '@dxos/teleport';
import { ComplexMap } from '@dxos/util';

export type ReplicationOptions = {
  upload: boolean;
};

/**
 * Manages replication between a set of feeds for a single teleport session.
 */
export class ReplicatorExtension implements TeleportExtension {
  private readonly _ctx = new Context({
    onError: (err) => {
      this._extensionContext?.close(err);
    },
  });

  private readonly _feeds = new ComplexMap<PublicKey, FeedWrapper<any>>(PublicKey.hash);
  private readonly _streams = new ComplexMap<PublicKey, ActiveStream>(PublicKey.hash);

  private _rpc?: ProtoRpcPeer<ServiceBundle>;
  private _extensionContext?: ExtensionContext;

  private _options: ReplicationOptions = {
    upload: false,
  };

  private readonly _updateTask = new DeferredTask(this._ctx, async () => {
    try {
      if (this._extensionContext!.initiator === false) {
        await this._rpc!.rpc.ReplicatorService.updateFeeds({
          feeds: Array.from(this._feeds.values()).map((feed) => ({
            feedKey: feed.key,
            download: true,
            upload: this._options.upload,
          })),
        });
      } else if (this._extensionContext!.initiator === true) {
        await this._reevaluateFeeds();
      }
    } catch (err) {
      if (err instanceof RpcClosedError) {
        return; // Some RPC requests might be pending while closing.
      }
      throw err;
    }
  });

  @logInfo
  private get extensionInfo() {
    return {
      initiator: this._extensionContext?.initiator,
      localPeerId: this._extensionContext?.localPeerId,
      remotePeerId: this._extensionContext?.remotePeerId,
      feeds: Array.from(this._feeds.keys()),
    };
  }

  setOptions(options: ReplicationOptions): this {
    this._options = options;
    log('setOptions', { options });
    if (this._extensionContext) {
      this._updateTask.schedule();
    }
    return this;
  }

  addFeed(feed: FeedWrapper<any>) {
    this._feeds.set(feed.key, feed);
    log('addFeed', { feedKey: feed.key });
    if (this._extensionContext) {
      this._updateTask.schedule();
    }
  }

  async onOpen(context: ExtensionContext) {
    this._extensionContext = context;
    log('open');

    this._rpc = createProtoRpcPeer<ServiceBundle, ServiceBundle>({
      requested: {
        ReplicatorService: schema.getService('dxos.mesh.teleport.replicator.ReplicatorService'),
      },
      exposed: {
        ReplicatorService: schema.getService('dxos.mesh.teleport.replicator.ReplicatorService'),
      },
      handlers: {
        ReplicatorService: {
          updateFeeds: async ({ feeds }) => {
            log('received feed info', { feeds });
            invariant(this._extensionContext!.initiator === true, 'Invalid call');
            this._updateTask.schedule();
          },
          startReplication: async ({ info }) => {
            log('starting replication...', { info });
            invariant(this._extensionContext!.initiator === false, 'Invalid call');

            const streamTag = await this._acceptReplication(info);
            return {
              streamTag,
            };
          },
          stopReplication: async ({ info }) => {
            log('stopping replication...', { info });
            // TODO(dmaretskyi): Make sure any peer can stop replication.
            invariant(this._extensionContext!.initiator === false, 'Invalid call');

            await this._stopReplication(info.feedKey);
          },
        },
      },
      port: await context.createPort('rpc', {
        contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"',
      }),
      timeout: 10_000,
    });
    await this._rpc.open();

    this._updateTask.schedule();
  }

  async onClose(err?: Error | undefined) {
    log('close', { err });
    await this._ctx.dispose();
    await this._rpc?.close();
    for (const feedKey of this._streams.keys()) {
      await this._stopReplication(feedKey);
    }
  }

  async onAbort(err?: Error | undefined) {
    log('abort', { err });

    await this._ctx.dispose();
    await this._rpc?.abort();
    for (const feedKey of this._streams.keys()) {
      await this._stopReplication(feedKey);
    }
  }

  @synchronized
  private async _reevaluateFeeds() {
    log('_reevaluateFeeds');
    for (const feedKey of this._feeds.keys()) {
      if (this._ctx.disposed) {
        return;
      }
      if (this._streams.has(feedKey) && this._options.upload !== this._streams.get(feedKey)?.info.upload) {
        try {
          await asyncTimeout(this._stopReplication(feedKey), 1000);
        } catch (err) {
          log.catch(err);
        }
      }

      if (this._ctx.disposed) {
        return;
      }
      if (!this._streams.has(feedKey)) {
        await this._initiateReplication({
          feedKey,
          download: true,
          upload: this._options.upload,
        });
      }
    }
  }

  /**
   * Try to initiate feed replication.
   */
  private async _initiateReplication(feedInfo: FeedInfo) {
    log('initiating replication', { feedInfo });
    invariant(this._extensionContext!.initiator === true, 'Invalid call');
    invariant(!this._streams.has(feedInfo.feedKey), `Replication already in progress for feed: ${feedInfo.feedKey}`);
    const { streamTag } = await this._rpc!.rpc.ReplicatorService.startReplication({ info: feedInfo });
    if (!streamTag) {
      return;
    }

    await this._replicateFeed(feedInfo, streamTag);
  }

  /**
   * Respond to a remote request to replicate a feed.
   * @returns A stream tag for the replication stream or `undefined` if we don't want to replicate.
   */
  @synchronized
  private async _acceptReplication(feedInfo: FeedInfo): Promise<string | undefined> {
    invariant(this._extensionContext!.initiator === false, 'Invalid call');

    if (!this._feeds.has(feedInfo.feedKey) || this._streams.has(feedInfo.feedKey)) {
      return undefined; // We don't have the feed or we are already replicating it.
    }

    const tag = `feed-${feedInfo.feedKey.toHex()}-${PublicKey.random().toHex().slice(0, 8)}`; // Generate a unique tag for the stream.
    await this._replicateFeed(feedInfo, tag);
    return tag;
  }

  private async _replicateFeed(info: FeedInfo, streamTag: string) {
    log('replicate', { info, streamTag });
    invariant(!this._streams.has(info.feedKey), `Replication already in progress for feed: ${info.feedKey}`);

    const feed = this._feeds.get(info.feedKey) ?? failUndefined();
    const networkStream = await this._extensionContext!.createStream(streamTag, {
      contentType: 'application/x-hypercore',
    });
    let replicationStreamErrors = 0;

    // https://github.com/holepunchto/hypercore/tree/v9.12.0#var-stream--feedreplicateisinitiator-options
    const replicationStream = feed.replicate(true, {
      live: true,
      upload: info.upload,
      download: info.download,
      noise: false,
      encrypted: false,
      maxRequests: 1024,
    });

    // Left for testing.
    // const debug = true;
    // if (debug) {
    //   feed.on('sync', () => {
    //     log.info('sync', { key: feed.key, length: feed.length });
    //   });
    //   feed.on('download', (index: number, data: any) => {
    //     log.info('download', {
    //       key: feed.key,
    //       index,
    //       length: feed.length,
    //       data: data.length,
    //     });
    //   });
    // }

    replicationStream.on('error', (err) => {
      if (err instanceof TimeoutError) {
        log.info('replication stream timeout', { err, info });
        return;
      }
      // TODO(nf): use sentinel errors
      if (
        err?.message === 'Writable stream closed prematurely' ||
        err?.message === 'Cannot call write after a stream was destroyed'
      ) {
        log('replication stream closed', { err, info });
        return;
      }

      // TODO(nf): WARN on first error? log full info on some subsequent errors?
      if (replicationStreamErrors === 0) {
        log.info('replication stream error', { err, info });
      } else {
        log.info('replication stream error', { err, feedKey: info.feedKey, count: replicationStreamErrors });
      }
      replicationStreamErrors++;
    });

    this._streams.set(info.feedKey, {
      streamTag,
      networkStream,
      replicationStream,
      info,
    });

    networkStream.pipe(replicationStream as any).pipe(networkStream);
  }

  private async _stopReplication(feedKey: PublicKey) {
    const stream = this._streams.get(feedKey);
    if (!stream) {
      return;
    }

    stream.networkStream.destroy();
    this._streams.delete(feedKey);
  }
}

type ServiceBundle = {
  ReplicatorService: ReplicatorService;
};

type ActiveStream = {
  streamTag: string;
  networkStream: Duplex;
  replicationStream: ProtocolStream;
  info: FeedInfo;
};
