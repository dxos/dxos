//
// Copyright 2022 DXOS.org
//

import type { ProtocolStream } from 'hypercore-protocol';
import assert from 'node:assert';
import { Duplex } from 'node:stream';

import { asyncTimeout, DeferredTask, synchronized } from '@dxos/async';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log, logInfo } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { FeedInfo, ReplicatorService } from '@dxos/protocols/proto/dxos/mesh/teleport/replicator';
import { createProtoRpcPeer, ProtoRpcPeer, RpcClosedError } from '@dxos/rpc';
import { ExtensionContext, TeleportExtension } from '@dxos/teleport';
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
      log.catch(err);
      this._extensionContext?.close(err);
    }
  });

  private readonly _feeds = new ComplexMap<PublicKey, FeedWrapper<any>>(PublicKey.hash);
  private readonly _streams = new ComplexMap<PublicKey, ActiveStream>(PublicKey.hash);

  private _rpc?: ProtoRpcPeer<ServiceBundle>;
  private _extensionContext?: ExtensionContext;

  private _options: ReplicationOptions = {
    upload: false
  };

  private readonly _updateTask = new DeferredTask(this._ctx, async () => {
    try {
      if (this._extensionContext!.initiator === false) {
        await this._rpc!.rpc.ReplicatorService.updateFeeds({
          feeds: Array.from(this._feeds.values()).map((feed) => ({
            feedKey: feed.key,
            download: true,
            upload: this._options.upload
          }))
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
      feeds: Array.from(this._feeds.keys())
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
        ReplicatorService: schema.getService('dxos.mesh.teleport.replicator.ReplicatorService')
      },
      exposed: {
        ReplicatorService: schema.getService('dxos.mesh.teleport.replicator.ReplicatorService')
      },
      handlers: {
        ReplicatorService: {
          updateFeeds: async ({ feeds }) => {
            log('received feed info', { feeds });
            assert(this._extensionContext!.initiator === true, 'Invalid call');
            this._updateTask.schedule();
          },
          startReplication: async ({ info }) => {
            log('starting replication...', { info });
            assert(this._extensionContext!.initiator === false, 'Invalid call');

            const streamTag = await this._acceptReplication(info);
            return {
              streamTag
            };
          },
          stopReplication: async ({ info }) => {
            log('stopping replication...', { info });
            // TODO(dmaretskyi): Make sure any peer can stop replication.
            assert(this._extensionContext!.initiator === false, 'Invalid call');

            await this._stopReplication(info.feedKey);
          }
        }
      },
      port: context.createPort('rpc', {
        contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"'
      })
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
          upload: this._options.upload
        });
      }
    }
  }

  /**
   * Try to initiate feed replication.
   */
  private async _initiateReplication(feedInfo: FeedInfo) {
    log('initiating replication', { feedInfo });
    assert(this._extensionContext!.initiator === true, 'Invalid call');
    assert(!this._streams.has(feedInfo.feedKey), `Replication already in progress for feed: ${feedInfo.feedKey}`);
    const { streamTag } = await this._rpc!.rpc.ReplicatorService.startReplication({ info: feedInfo });
    if (!streamTag) {
      return;
    }

    this._replicateFeed(feedInfo, streamTag);
  }

  /**
   * Respond to a remote request to replicate a feed.
   * @returns A stream tag for the replication stream or `undefined` if we don't want to replicate.
   */
  @synchronized
  private async _acceptReplication(feedInfo: FeedInfo): Promise<string | undefined> {
    assert(this._extensionContext!.initiator === false, 'Invalid call');

    if (!this._feeds.has(feedInfo.feedKey) || this._streams.has(feedInfo.feedKey)) {
      return undefined; // We don't have the feed or we are already replicating it.
    }

    const tag = `feed-${feedInfo.feedKey.toHex()}-${PublicKey.random().toHex().slice(0, 8)}`; // Generate a unique tag for the stream.
    this._replicateFeed(feedInfo, tag);
    return tag;
  }

  private _replicateFeed(info: FeedInfo, streamTag: string) {
    log('replicate', { info, streamTag });
    assert(!this._streams.has(info.feedKey), `Replication already in progress for feed: ${info.feedKey}`);

    const feed = this._feeds.get(info.feedKey) ?? failUndefined();
    const networkStream = this._extensionContext!.createStream(streamTag, {
      contentType: 'application/x-hypercore'
    });
    const replicationStream = feed.replicate(true, {
      live: true,
      upload: info.upload,
      download: info.download,
      noise: false,
      encrypted: false
    });
    replicationStream.on('error', (err) => {
      if (
        err?.message === 'Writable stream closed prematurely' ||
        err?.message === 'Cannot call write after a stream was destroyed'
      ) {
        return;
      }

      log.warn('replication stream error', { err, info });
    });

    this._streams.set(info.feedKey, {
      streamTag,
      networkStream,
      replicationStream,
      info
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
