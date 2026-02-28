//
// Copyright 2022 DXOS.org
//

import { type Duplex } from 'node:stream';

import type { ProtocolStream } from 'hypercore-protocol';

import { DeferredTask, asyncTimeout, synchronized } from '@dxos/async';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { type FeedWrapper } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import { RpcClosedError, TimeoutError } from '@dxos/protocols';
import { EMPTY, create, encodePublicKey, toPublicKey } from '@dxos/protocols/buf';
import {
  type FeedInfo,
  FeedInfoSchema,
  ReplicatorService,
  StartReplicationResponseSchema,
} from '@dxos/protocols/buf/dxos/mesh/teleport/replicator_pb';
import {
  type BufProtoRpcPeer,
  createBufProtoRpcPeer,
} from '@dxos/rpc';
import { type ExtensionContext, type TeleportExtension } from '@dxos/teleport';
import { ComplexMap } from '@dxos/util';

export type ReplicationOptions = {
  upload: boolean;
};

type ServiceBundle = { ReplicatorService: typeof ReplicatorService };

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

  private _rpc?: BufProtoRpcPeer<ServiceBundle>;
  private _extensionContext?: ExtensionContext;

  private _options: ReplicationOptions = {
    upload: false,
  };

  private readonly _updateTask = new DeferredTask(this._ctx, async () => {
    try {
      if (this._extensionContext!.initiator === false) {
        await this._rpc!.rpc.ReplicatorService.updateFeeds({
          feeds: Array.from(this._feeds.values()).map((feed) => ({
            feedKey: encodePublicKey(feed.key),
            download: true,
            upload: this._options.upload,
          })),
        });
      } else if (this._extensionContext!.initiator === true) {
        await this._reevaluateFeeds();
      }
    } catch (err) {
      if (err instanceof RpcClosedError) {
        return;
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

  addFeed(feed: FeedWrapper<any>): void {
    this._feeds.set(feed.key, feed);
    log('addFeed', { feedKey: feed.key });
    if (this._extensionContext) {
      this._updateTask.schedule();
    }
  }

  async onOpen(context: ExtensionContext): Promise<void> {
    this._extensionContext = context;
    log('open');

    this._rpc = createBufProtoRpcPeer<ServiceBundle, ServiceBundle>({
      requested: { ReplicatorService },
      exposed: { ReplicatorService },
      handlers: {
        ReplicatorService: {
          updateFeeds: async ({ feeds }) => {
            log('received feed info', { feeds });
            invariant(this._extensionContext!.initiator === true, 'Invalid call');
            this._updateTask.schedule();
            return EMPTY;
          },
          startReplication: async ({ info }) => {
            log('starting replication...', { info });
            invariant(this._extensionContext!.initiator === false, 'Invalid call');

            const streamTag = await this._acceptReplication(info!);
            return create(StartReplicationResponseSchema, { streamTag });
          },
          stopReplication: async ({ info }) => {
            log('stopping replication...', { info });
            invariant(this._extensionContext!.initiator === false, 'Invalid call');

            await this._stopReplication(toPublicKey(info!.feedKey!));
            return EMPTY;
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

  async onClose(err?: Error | undefined): Promise<void> {
    log('close', { err });
    await this._ctx.dispose();
    await this._rpc?.close();
    for (const feedKey of this._streams.keys()) {
      await this._stopReplication(feedKey);
    }
  }

  async onAbort(err?: Error | undefined): Promise<void> {
    log('abort', { err });

    await this._ctx.dispose();
    await this._rpc?.abort();
    for (const feedKey of this._streams.keys()) {
      await this._stopReplication(feedKey);
    }
  }

  @synchronized
  private async _reevaluateFeeds(): Promise<void> {
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
        await this._initiateReplication(
          create(FeedInfoSchema, {
            feedKey: encodePublicKey(feedKey),
            download: true,
            upload: this._options.upload,
          }),
        );
      }
    }
  }

  /**
   * Try to initiate feed replication.
   */
  private async _initiateReplication(feedInfo: FeedInfo): Promise<void> {
    log('initiating replication', { feedInfo });
    invariant(this._extensionContext!.initiator === true, 'Invalid call');
    const feedKey = toPublicKey(feedInfo.feedKey!);
    invariant(!this._streams.has(feedKey), `Replication already in progress for feed: ${feedKey}`);
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
    const feedKey = toPublicKey(feedInfo.feedKey!);
    if (!this._feeds.has(feedKey) || this._streams.has(feedKey)) {
      return undefined;
    }

    const tag = `feed-${feedKey.toHex()}-${PublicKey.random().toHex().slice(0, 8)}`;
    await this._replicateFeed(feedInfo, tag);
    return tag;
  }

  private async _replicateFeed(info: FeedInfo, streamTag: string): Promise<void> {
    log('replicate', { info, streamTag });
    const feedKey = toPublicKey(info.feedKey!);
    invariant(!this._streams.has(feedKey), `Replication already in progress for feed: ${feedKey}`);

    const feed = this._feeds.get(feedKey) ?? failUndefined();
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

      if (replicationStreamErrors === 0) {
        log.info('replication stream error', { err, info });
      } else {
        log.info('replication stream error', { err, feedKey, count: replicationStreamErrors });
      }
      replicationStreamErrors++;
    });

    this._streams.set(feedKey, {
      streamTag,
      networkStream,
      replicationStream,
      info,
    });

    networkStream.pipe(replicationStream as any).pipe(networkStream);
  }

  private async _stopReplication(feedKey: PublicKey): Promise<void> {
    const stream = this._streams.get(feedKey);
    if (!stream) {
      return;
    }

    stream.networkStream.destroy();
    this._streams.delete(feedKey);
  }
}

type ActiveStream = {
  streamTag: string;
  networkStream: Duplex;
  replicationStream: ProtocolStream;
  info: FeedInfo;
};
