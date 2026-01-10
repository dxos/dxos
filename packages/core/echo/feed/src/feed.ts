import * as Effect from 'effect/Effect';
import { SpaceId } from '@dxos/keys';
import { Block, FeedSyncMessage } from './protocol';
import { FeedStore } from './feed-store';

export class Feed {
  // Store is now passed in, decoupling persistence
  constructor(
    private readonly _store: FeedStore,
    private readonly _spaceId: string,
    private readonly _feedId: string,
  ) {}

  get spaceId() {
    return this._spaceId;
  }
  get feedId() {
    return this._feedId;
  }

  get store() {
    return this._store;
  }

  append = Effect.fn('Feed.append')((blocks: Block[]): Effect.Effect<void, any, any> => this._store.append(blocks));

  getBlocks = Effect.fn('Feed.getBlocks')(
    (range: FeedSyncMessage['requestRange']): Effect.Effect<Block[], any, any> => this._store.getBlocks(range),
  );

  /**
   * Generates a sync message to send to a peer.
   * Includes the range of blocks we want to request (everything after our last position)
   * and blocks we have that are unpositioned (to push).
   */
  generateSyncMessage = Effect.fn('Feed.generateSyncMessage')(
    (options: { limit?: number } = {}): Effect.Effect<FeedSyncMessage, any, any> =>
      Effect.gen(this, function* () {
        const lastPosition = yield* this._store.getLastPosition();

        // We request everything after what we have
        const requestRange = {
          after: lastPosition,
          to: null, // Request until end
        };

        // We push blocks we have that don't have a position
        const blocks = yield* this._store.getUnpositionedBlocks(options.limit ?? 50);

        return {
          spaceId: this._spaceId as SpaceId,
          feedId: this._feedId,
          havePosition: lastPosition,
          requestRange,
          blocks,
          acks: [],
        };
      }),
  );

  /**
   * Processes an incoming sync message.
   */
  receiveSyncMessage = Effect.fn('Feed.receiveSyncMessage')(
    (message: FeedSyncMessage): Effect.Effect<FeedSyncMessage, any, any> =>
      Effect.gen(this, function* () {
        // 1. Append received blocks
        if (message.blocks.length > 0) {
          yield* this._store.append(message.blocks);
        }

        // 2. Handle requestRange
        // The peer is asking for blocks in a certain range.
        // Query blocks even if range is open-ended (nulls) - this covers initial sync
        const responseBlocks = yield* this._store.getBlocks(message.requestRange);

        // 3. Generate response
        const lastPosition = yield* this._store.getLastPosition();

        const response: FeedSyncMessage = {
          spaceId: this._spaceId as SpaceId,
          feedId: this._feedId,
          havePosition: lastPosition,
          requestRange: { after: lastPosition, to: null }, // Reciprocally ask for updates
          blocks: responseBlocks,
          acks: [],
        };

        return response;
      }),
  );
}
