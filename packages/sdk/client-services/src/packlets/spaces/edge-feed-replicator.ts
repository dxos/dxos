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
import { log, logInfo } from '@dxos/log';
import { EdgeService } from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import {
  type Message as RouterMessage,
  MessageSchema as RouterMessageSchema,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import type { FeedBlock, ProtocolMessage } from '@dxos/protocols/feed-replication';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import { ComplexMap, arrayToBuffer, bufferToArray, defaultMap, rangeFromTo } from '@dxos/util';

export type EdgeFeedReplicatorParams = {
  messenger: EdgeConnection;
  spaceId: SpaceId;
};

export class EdgeFeedReplicator extends Resource {
  private readonly _messenger: EdgeConnection;

  @logInfo
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
    log('open');
    // TODO: handle reconnects
    this._ctx.onDispose(
      this._messenger.onMessage((message: RouterMessage) => {
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
        log('receive', { from: message.source, feedKey: payload.feedKey, type: payload.type });
        this._onMessage(payload);
      }),
    );

    this._ctx.onDispose(
      this._messenger.onReconnected(() => {
        scheduleMicroTask(this._ctx, () => this._handleReconnect());
      }),
    );
  }

  private async _handleReconnect(): Promise<void> {
    await this._resetConnection();
    if (this._messenger.status.state === EdgeStatus.ConnectionState.CONNECTED) {
      this._startReplication();
    }
  }

  protected override async _close(): Promise<void> {
    log('close');
    await this._resetConnection();
  }

  private _startReplication(): void {
    this._connected = true;
    const connectionCtx = this._createConnectionContext();
    this._connectionCtx = connectionCtx;
    log('connection context created');
    scheduleMicroTask(connectionCtx, async () => {
      for (const feed of this._feeds.values()) {
        await this._replicateFeed(connectionCtx, feed);
      }
    });
  }

  private async _resetConnection(): Promise<void> {
    log('resetConnection');
    this._connected = false;
    await this._connectionCtx?.dispose();
    this._connectionCtx = undefined;
    this._remoteLength.clear();
  }

  async addFeed(feed: FeedWrapper<any>): Promise<void> {
    log('addFeed', { key: feed.key, connected: this._connected, hasConnectionCtx: !!this._connectionCtx });
    this._feeds.set(feed.key, feed);

    if (this._connected && this._connectionCtx) {
      await this._replicateFeed(this._connectionCtx, feed);
    }
  }

  private _getPushMutex(key: PublicKey): Mutex {
    return defaultMap(this._pushMutex, key, () => new Mutex());
  }

  private async _replicateFeed(ctx: Context, feed: FeedWrapper<any>): Promise<void> {
    log('replicateFeed', { key: feed.key });
    await this._sendMessage({
      type: 'get-metadata',
      feedKey: feed.key.toHex(),
    });

    Event.wrap(feed.core as any, 'append').on(ctx, async () => {
      await this._pushBlocksIfNeeded(feed);
    });
  }

  private async _sendMessage(message: ProtocolMessage): Promise<void> {
    if (!this._connectionCtx) {
      log('message dropped because connection was disposed');
      return;
    }

    if (message.type === 'data') {
      log('sending blocks', {
        feedKey: message.feedKey,
        blocks: message.blocks.map((b) => b.index),
      });
    }

    invariant(message.feedKey);
    const payloadValue = bufferToArray(encodeCbor(message));

    log('send', { type: message.type });
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

  private _onMessage(message: ProtocolMessage): void {
    if (!this._connectionCtx) {
      log.warn('received message after connection context was disposed');
      return;
    }
    scheduleMicroTask(this._connectionCtx, async () => {
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

          const logMeta = { localLength: feed.length, remoteLength: message.length, feedKey };
          if (message.length > feed.length) {
            log('requesting missing blocks', logMeta);

            await this._sendMessage({
              type: 'request',
              feedKey: feedKey.toHex(),
              range: { from: feed.length, to: message.length },
            });
          } else if (message.length < feed.length) {
            log('pushing blocks to remote', logMeta);

            await this._pushBlocks(feed, message.length, feed.length);
          }

          break;
        }

        case 'data': {
          log('received data', { feed: message.feedKey, blocks: message.blocks.map((b) => b.index) });

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

  private async _pushBlocks(feed: FeedWrapper<any>, from: number, to: number): Promise<void> {
    log('pushing blocks', { feed: feed.key.toHex(), from, to });

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

  private async _integrateBlocks(feed: FeedWrapper<any>, blocks: FeedBlock[]): Promise<void> {
    log('integrating blocks', { feed: feed.key.toHex(), blocks: blocks.length });

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

  private async _pushBlocksIfNeeded(feed: FeedWrapper<any>): Promise<void> {
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

  private _createConnectionContext(): Context {
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
    return connectionCtx;
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
