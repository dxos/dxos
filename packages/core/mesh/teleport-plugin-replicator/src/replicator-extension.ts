import { ExtensionContext, TeleportExtension } from '@dxos/teleport'
import { FeedWrapper } from '@dxos/feed-store'
import { DeferredTask, synchronized } from '@dxos/async'
import { FeedInfo, ReplicatorService } from '@dxos/protocols/proto/dxos/mesh/teleport/replicator'
import { Context } from '@dxos/context'
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc'
import { schema } from '@dxos/protocols'
import { ComplexMap } from '@dxos/util'
import { PublicKey } from '@dxos/keys'
import { Duplex } from 'stream'
import { failUndefined } from '@dxos/debug'
import { assert } from 'console'
import { log } from '@dxos/log'

export type ReplicationOptions = {
  upload: boolean
}

type ActiveStream = {
  streamTag: string
  stream: Duplex
  info: FeedInfo
}

export class ReplicatorExtension implements TeleportExtension {
  private readonly _ctx = new Context()

  private readonly _feeds = new ComplexMap<PublicKey, FeedWrapper<any>>(PublicKey.hash)
  private _options: ReplicationOptions = {
    upload: false
  }

  private _rpc?: ProtoRpcPeer<ServiceBundle>
  private _extensionContext?: ExtensionContext;
  private readonly _streams = new ComplexMap<PublicKey, ActiveStream>(PublicKey.hash);

  private readonly updateTask = new DeferredTask(this._ctx, async () => {
    if(this._extensionContext!.initiator === false) {
      await this._rpc!.rpc.ReplicatorService.updateFeeds({
        feeds: Array.from(this._feeds.values()).map(feed => ({
          feedKey: feed.key,
          download: true,
          upload: this._options.upload
        }))
      })
    } else if (this._extensionContext!.initiator === true) {
      await this._reevaluateFeeds();
    }
  })

  setOptions(options: ReplicationOptions) {
    this._options = options;
    if(this._extensionContext && this._extensionContext.initiator === false) {
      this.updateTask.schedule();
    }
  }

  addFeed(feed: FeedWrapper<any>) {
    this._feeds.set(feed.key, feed);
    if(this._extensionContext && this._extensionContext.initiator === false) {
      this.updateTask.schedule();
    }
  }

  async onOpen(context: ExtensionContext) {
    this._extensionContext = context;

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
          },
          startReplication: async ({ info }) => {
            log('startReplication', { info })
            assert(this._extensionContext!.initiator === false, 'Invalid call');

            const streamTag = await this._acceptReplication(info);
            return {
              streamTag
            }
          },
          stopReplication: async ({ info }) => {
            log('stopReplication', { info })
            // TODO(dmaretskyi): Make sure any peer can stop replication.
            assert(this._extensionContext!.initiator === false, 'Invalid call');

            this._stopReplication(info.feedKey);
          },
        }
      },
      port: context.createPort('rpc', {
        contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"'
      })
    });
    await this._rpc.open();

    this.updateTask.schedule();
  }

  async onClose(err?: Error | undefined) {
    await this._rpc?.close();
  }

  @synchronized
  private async _reevaluateFeeds() {
    for(const feedKey of this._feeds.keys()) {
      if(!this._streams.has(feedKey)) {
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
    assert(this._extensionContext!.initiator === true, 'Invalid call')
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

    if(!this._feeds.has(feedInfo.feedKey) || this._streams.has(feedInfo.feedKey)) {
      return undefined; // We don't have the feed or we are already replicating it.
    }

    const tag = `feed/${feedInfo.feedKey.toHex()}/${PublicKey.random().toHex().slice(0, 8)}`; // Generate a unique tag for the stream.
    this._replicateFeed(feedInfo, tag);
    return tag;
  }

  private _replicateFeed(info: FeedInfo, streamTag: string) {
    const feed = this._feeds.get(info.feedKey) ?? failUndefined();

    assert(!this._streams.has(info.feedKey), `Replication already in progress for feed: ${info.feedKey}`);
    const stream = this._extensionContext!.createStream(streamTag, {
      contentType: 'application/x-hypercore'
    })
    this._streams.set(info.feedKey, {
      streamTag,
      stream,
      info
    });

    const replicationStream = feed.replicate(true, { live: true, upload: info.upload, download: info.download });
    stream.pipe(replicationStream).pipe(stream);
  }

  private _stopReplication(feedKey: PublicKey) {
    const stream = this._streams.get(feedKey);
    if(!stream) {
      return;
    }

    stream.stream.destroy();
    this._streams.delete(feedKey);
  }
}

type ServiceBundle = {
  ReplicatorService: ReplicatorService
}