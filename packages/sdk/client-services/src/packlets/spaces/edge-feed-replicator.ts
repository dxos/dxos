//
// Copyright 2024 DXOS.org
//

import { decode as decodeCbor, encode as encodeCbor } from 'cbor-x';

import { Event, Mutex, scheduleMicroTask } from '@dxos/async';
import { Resource, type Context } from '@dxos/context';
import { Message, type Messenger } from '@dxos/edge-client';
import { type FeedWrapper } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import type { FeedBlock, ProtocolMessage } from '@dxos/protocols/feed-replication';
import { arrayToBuffer, bufferToArray, ComplexMap, defaultMap, rangeFromTo } from '@dxos/util';

export type EdgeFeedReplicatorParams = {
  messenger: Messenger;
  spaceId: SpaceId;
};

export class EdgeFeedReplicator extends Resource {
  private readonly _messenger: Messenger;
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
    this._ctx.onDispose(
      this._messenger.addListener(async (message) => {
        log.info('recv', { message });
        if (!message.serviceId) {
          return;
        }
        const [service, ...rest] = message.serviceId.split(':');
        if (service !== 'hypercore-replicator') {
          return;
        }

        const [spaceId] = rest;
        log.info('compare spaceID', { spaceId, _spaceId: this._spaceId });
        if (spaceId !== this._spaceId) {
          return;
        }

        const payload = decodeCbor(message.payload!.value) as ProtocolMessage;

        this._onMessage(payload);
      }),
    );

    this._connected = true;
    this._connectionCtx = this._ctx.derive();
    for (const feed of this._feeds.values()) {
      await this._replicateFeed(feed);
    }
  }

  protected override async _close(): Promise<void> {
    this._connected = false;

    this._connected = false;
    await this._connectionCtx?.dispose();
    this._connectionCtx = undefined;
    this._remoteLength.clear();
  }

  async addFeed(feed: FeedWrapper<any>) {
    log.info('addFeed', { key: feed.key });
    this._feeds.set(feed.key, feed);

    if (this._connected) {
      await this._replicateFeed(feed);
    }
  }

  private _getPushMutex(key: PublicKey) {
    return defaultMap(this._pushMutex, key, () => new Mutex());
  }

  private async _replicateFeed(feed: FeedWrapper<any>) {
    invariant(this._connectionCtx);

    this._sendMessage({
      type: 'get-metadata',
      feedKey: feed.key.toHex(),
    });

    Event.wrap(feed.core as any, 'append').on(this._connectionCtx, async () => {
      await this._pushBlocksIfNeeded(feed);
    });

    // Event.wrap(feed.core as any, 'ready').on(this._connectionCtx, async () => {
    //   await this._pushBlocksIfNeeded(feed);
    // });
  }

  private _sendMessage(message: ProtocolMessage) {
    log.info('sending message', { message });

    invariant(message.feedKey);
    const payloadValue = bufferToArray(encodeCbor(message));

    this._messenger.send(
      new Message({
        source: {
          identityKey: this._messenger.identityKey.toHex(),
          peerKey: this._messenger.deviceKey.toHex(),
        },
        serviceId: `hypercore-replicator:${this._spaceId}`,
        payload: { value: payloadValue },
      }),
    );
  }

  private _onMessage(message: ProtocolMessage) {
    log.info('received message', { message });

    scheduleMicroTask(this._ctx, async () => {
      switch (message.type) {
        case 'metadata': {
          const feedKey = PublicKey.fromHex(message.feedKey);
          const feed = this._feeds.get(feedKey);
          if (!feed) {
            log.warn('Feed not found', { feedKey });
            return;
          }

          using _guard = await this._getPushMutex(feed.key).acquire();

          this._remoteLength.set(feedKey, message.length);

          if (message.length > feed.length) {
            this._sendMessage({
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

    this._sendMessage({
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
    using _guard = await this._getPushMutex(feed.key).acquire();

    if (!this._remoteLength.has(feed.key)) {
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

// TODO(dmaretskyi): Protocol types.
// TODO(dmaretskyi): Automerge core protocol vs websocket protocol.
// TODO(dmaretskyi): Backpressure.
// TODO(dmaretskyi): Worker share policy.
