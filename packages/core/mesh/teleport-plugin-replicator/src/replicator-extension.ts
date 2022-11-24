import { ExtensionContext, TeleportExtension } from '@dxos/teleport'
import { FeedWrapper } from '@dxos/feed-store'
import { asyncTimeout, DeferredTask, synchronized } from '@dxos/async'
import { FeedInfo, ReplicatorService } from '@dxos/protocols/proto/dxos/mesh/teleport/replicator'
import { Context } from '@dxos/context'
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc'
import { schema } from '@dxos/protocols'
import { ComplexMap } from '@dxos/util'
import { PublicKey } from '@dxos/keys'
import { Duplex } from 'stream'
import { failUndefined } from '@dxos/debug'
import { assert } from 'console'
import { log, logInfo } from '@dxos/log'
import type { ProtocolStream } from 'hypercore-protocol'

export type ReplicationOptions = {
  upload: boolean
}

type ActiveStream = {
  streamTag: string
  networkStream: Duplex
  replicationStream: ProtocolStream
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

  @logInfo
  private get extensionInfo() {
    return {
      initiator: this._extensionContext?.initiator,
      localPeerId: this._extensionContext?.localPeerId,
      remotePeerId: this._extensionContext?.remotePeerId,
    }
  }

  private readonly updateTask = new DeferredTask(this._ctx, async () => {
    log('process update');
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

  setOptions(options: ReplicationOptions): this {
    this._options = options;
    log('setOptions', { options });
    if(this._extensionContext) {
      this.updateTask.schedule();
    }
    return this
  }

  addFeed(feed: FeedWrapper<any>) {
    this._feeds.set(feed.key, feed);
    log('addFeed', { feedKey: feed.key });
    if(this._extensionContext) {
      this.updateTask.schedule();
    }
  }

  async onOpen(context: ExtensionContext) {
    this._extensionContext = context;
    log('open')

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
            this.updateTask.schedule();
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

            await this._stopReplication(info.feedKey);
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
    log('close')
    await this._rpc?.close();
    for(const feedKey of this._streams.keys()) {
      await this._stopReplication(feedKey);
    }
  }

  @synchronized
  private async _reevaluateFeeds() {
    for(const feedKey of this._feeds.keys()) {
      if(this._streams.has(feedKey) && this._options.upload !== this._streams.get(feedKey)?.info.upload) {
        try {
          await asyncTimeout(this._stopReplication(feedKey), 1000);
        } catch(err) {
          log.catch(err);
        }
      }

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

    const tag = `feed-${feedInfo.feedKey.toHex()}-${PublicKey.random().toHex().slice(0, 8)}`; // Generate a unique tag for the stream.
    this._replicateFeed(feedInfo, tag);
    return tag;
  }

  private _replicateFeed(info: FeedInfo, streamTag: string) {
    log('replicate', { info, streamTag});
    assert(!this._streams.has(info.feedKey), `Replication already in progress for feed: ${info.feedKey}`);
    
    const feed = this._feeds.get(info.feedKey) ?? failUndefined();
    const networkStream = this._extensionContext!.createStream(streamTag, {
      contentType: 'application/x-hypercore'
    })
    const replicationStream = feed.replicate(true, {
      live: true,
      upload: info.upload,
      download: info.download,
      noise: false,
      encrypted: false,
    });
    replicationStream.on('error', (err) => {
      if(err?.message === 'Writable stream closed prematurely') {
        return
      }

      log.warn('replication stream error', { err, info });
    })

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
    if(!stream) {
      return;
    }

    stream.networkStream.destroy();
    this._streams.delete(feedKey);
  }
}

type ServiceBundle = {
  ReplicatorService: ReplicatorService
}