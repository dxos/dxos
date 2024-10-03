//
// Copyright 2024 DXOS.org
//

import { decode as decodeCbor, encode as encodeCbor } from 'cbor-x';

import { Event, Mutex, scheduleMicroTask } from '@dxos/async';
import { Context, Resource } from '@dxos/context';
import { type EdgeConnection } from '@dxos/edge-client';
import { EdgeConnectionClosedError, EdgeIdentityChangedError } from '@dxos/edge-client';
import { type FeedWrapper } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { EdgeService } from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import {
  MessageSchema as RouterMessageSchema,
  type Message as RouterMessage,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import type { FeedBlock, ProtocolMessage } from '@dxos/protocols/feed-replication';
import { ComplexMap, arrayToBuffer, bufferToArray, defaultMap, rangeFromTo } from '@dxos/util';

export type EdgeFeedReplicatorParams = {
  messenger: EdgeConnection;
  spaceId: SpaceId;
};

export class EdgeFeedReplicator extends Resource {
  private readonly _messenger: EdgeConnection;
  private readonly _spaceId: SpaceId;
  private readonly _feeds = new ComplexMap<PublicKey, FeedWrapper<any>>(PublicKey.hash);

  private _connectionCtx?: Context = undefined;
  private _connected = false;
  /**
   * Feed length at service.
   */
  private _remoteLength = new ComplexMap<PublicKey, number>(PublicKey.hash);

  /**
   * Protects against concurrent pushes so that remote length is updated consistently.
   */
  private _pushMutex = new ComplexMap<PublicKey, Mutex>(PublicKey.hash);

  constructor({ messenger, spaceId }: EdgeFeedReplicatorParams) {
    super();
    this._messenger = messenger;
    this._spaceId = spaceId;
  }

  protected override async _open(): Promise<void> {
    // TODO: handle reconnects
    this._ctx.onDispose(
      this._messenger.addListener((message: RouterMessage) => {
        if (!message.serviceId) {
          return;
        }
        const [service, ...rest] = message.serviceId.split(':');
        if (service !== EdgeService.FEED_REPLICATOR) {
          return;
        }

        const [spaceId] = rest;
        if (spaceId !== this._spaceId) {
          log('spaceID mismatch', { spaceId, _spaceId: this._spaceId });
          return;
        }

        const payload = decodeCbor(message.payload!.value) as ProtocolMessage;
        log.info('receive', { from: message.source, feedKey: payload.feedKey, type: payload.type });
        this._onMessage(payload);
      }),
    );

    this._messenger.connected.on(this._ctx, async () => {
      await this._resetConnection();

      this._connected = true;
      const connectionCtx = new Context({
        onError: async (err: any) => {
          if (connectionCtx !== this._connectionCtx) {
            return;
          }
          if (err instanceof EdgeIdentityChangedError || err instanceof EdgeConnectionClosedError) {
            log('resetting on reconnect');
            await this._resetConnection();
          } else {
            this._ctx.raise(err);
          }
        },
      });
      this._connectionCtx = connectionCtx;
      log('connection context created');
      scheduleMicroTask(connectionCtx, async () => {
        for (const feed of this._feeds.values()) {
          await this._replicateFeed(connectionCtx, feed);
        }
      });
    });
  }

  protected override async _close(): Promise<void> {
    await this._resetConnection();
  }

  private async _resetConnection() {
    this._connected = false;
    await this._connectionCtx?.dispose();
    this._connectionCtx = undefined;
    this._remoteLength.clear();
  }

  async addFeed(feed: FeedWrapper<any>) {
    log.info('addFeed', { key: feed.key });
    this._feeds.set(feed.key, feed);

    if (this._connected && this._connectionCtx) {
      await this._replicateFeed(this._connectionCtx, feed);
    }
  }

  private _getPushMutex(key: PublicKey) {
    return defaultMap(this._pushMutex, key, () => new Mutex());
  }

  private async _replicateFeed(ctx: Context, feed: FeedWrapper<any>) {
    await this._sendMessage({
      type: 'get-metadata',
      feedKey: feed.key.toHex(),
    });

    Event.wrap(feed.core as any, 'append').on(ctx, async () => {
      await this._pushBlocksIfNeeded(feed);
    });
  }

  private async _sendMessage(message: ProtocolMessage) {
    if (!this._connectionCtx) {
      log.info('message dropped because connection was disposed');
      return;
    }

    const logPayload =
      message.type === 'data' ? { feedKey: message.feedKey, blocks: message.blocks.map((b) => b.index) } : { message };
    log.info('sending message', logPayload);

    invariant(message.feedKey);
    const payloadValue = bufferToArray(encodeCbor(message));

    await this._messenger.send(
      buf.create(RouterMessageSchema, {
        source: {
          identityKey: this._messenger.identityKey,
          peerKey: this._messenger.peerKey,
        },
        serviceId: `${EdgeService.FEED_REPLICATOR}:${this._spaceId}`,
        payload: { value: payloadValue },
      }),
    );
  }

  private _onMessage(message: ProtocolMessage) {
    if (!this._connectionCtx) {
      log.warn('received message after connection context was disposed');
      return;
    }
    scheduleMicroTask(this._connectionCtx, async () => {
      switch (message.type) {
        case 'metadata': {
          log.info('received metadata', { message });

          const feedKey = PublicKey.fromHex(message.feedKey);
          const feed = this._feeds.get(feedKey);
          if (!feed) {
            log.warn('Feed not found', { feedKey });
            return;
          }

          using _guard = await this._getPushMutex(feed.key).acquire();

          this._remoteLength.set(feedKey, message.length);

          if (message.length > feed.length) {
            await this._sendMessage({
              type: 'request',
              feedKey: feedKey.toHex(),
              range: { from: feed.length, to: message.length },
            });
          } else if (message.length < feed.length) {
            await this._pushBlocks(feed, message.length, feed.length);
          }

          break;
        }

        case 'data': {
          log.info('received data', { feed: message.feedKey, blocks: message.blocks.map((b) => b.index) });

          const feedKey = PublicKey.fromHex(message.feedKey);
          const feed = this._feeds.get(feedKey);
          if (!feed) {
            log.warn('Feed not found', { feedKey });
            return;
          }

          await this._integrateBlocks(feed, message.blocks);
          break;
        }

        default: {
          log.warn('Unknown message', { ...message });
        }
      }
    });
  }

  private async _pushBlocks(feed: FeedWrapper<any>, from: number, to: number) {
    log.info('pushing blocks', { feed: feed.key.toHex(), from, to });

    const blocks: FeedBlock[] = await Promise.all(
      rangeFromTo(from, to).map(async (index) => {
        const data = await feed.get(index, { valueEncoding: 'binary' });
        invariant(data instanceof Uint8Array);
        const proof = await feed.proof(index);

        return {
          index,
          data,
          nodes: proof.nodes,
          signature: proof.signature,
        } satisfies FeedBlock;
      }),
    );

    await this._sendMessage({
      type: 'data',
      feedKey: feed.key.toHex(),
      blocks,
    });
    this._remoteLength.set(feed.key, to);
  }

  private async _integrateBlocks(feed: FeedWrapper<any>, blocks: FeedBlock[]) {
    log.info('integrating blocks', { feed: feed.key.toHex(), blocks: blocks.length });

    for (const block of blocks) {
      if (feed.has(block.index)) {
        continue;
      }
      const blockBuffer = bufferizeBlock(block);

      await feed.putBuffer(
        block.index,
        blockBuffer.data,
        { nodes: blockBuffer.nodes, signature: blockBuffer.signature },
        null,
      );
    }
  }

  private async _pushBlocksIfNeeded(feed: FeedWrapper<any>) {
    using _ = await this._getPushMutex(feed.key).acquire();

    if (!this._remoteLength.has(feed.key)) {
      log('blocks not pushed because remote length is unknown');
      return;
    }

    const remoteLength = this._remoteLength.get(feed.key)!;
    if (remoteLength < feed.length) {
      await this._pushBlocks(feed, remoteLength, feed.length);
    }
  }
}

// hypercore requires buffers
const bufferizeBlock = (block: FeedBlock) => ({
  index: block.index,
  data: arrayToBuffer(block.data),
  nodes: block.nodes.map((node) => ({
    index: node.index,
    hash: arrayToBuffer(node.hash),
    size: node.size,
  })),
  signature: arrayToBuffer(block.signature),
});
