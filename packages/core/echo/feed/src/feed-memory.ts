import * as Effect from 'effect/Effect';
import { Block, FeedSyncMessage } from './protocol';
import { FeedStore } from './feed-store';

export class InMemoryFeedStore implements FeedStore {
  private _blocks: Block[] = [];

  append = Effect.fn('InMemoryFeedStore.append')(
    (blocks: Block[]): Effect.Effect<void> =>
      Effect.sync(() => {
        for (const block of blocks) {
          // Idempotency check: assuming (sequence, actorId) is unique
          const exists = this._blocks.some((b) => b.sequence === block.sequence && b.actorId === block.actorId);
          if (!exists) {
            this._blocks.push(block);
          }
        }
      }),
  );

  getBlocks = Effect.fn('InMemoryFeedStore.getBlocks')(
    (range: FeedSyncMessage['requestRange']): Effect.Effect<Block[]> =>
      Effect.sync(() => {
        let result = this._blocks.filter((b) => b.position !== null); // Only positioned blocks for this query type usually?

        if (range.after !== null) {
          result = result.filter((b) => b.position! > range.after!);
        }
        if (range.to !== null) {
          result = result.filter((b) => b.position! <= range.to!);
        }

        return result.sort((a, b) => a.position! - b.position!);
      }),
  );

  getUnpositionedBlocks = Effect.fn('InMemoryFeedStore.getUnpositionedBlocks')(
    (limit: number = 50): Effect.Effect<Block[]> =>
      Effect.sync(() => {
        const unpositioned = this._blocks.filter((b) => b.position === null);
        // Sort by Lamport: sequence ASC, actorId ASC
        unpositioned.sort((a, b) => {
          if (a.sequence !== b.sequence) return a.sequence - b.sequence;
          return a.actorId.localeCompare(b.actorId);
        });
        return unpositioned.slice(0, limit);
      }),
  );

  getLastPosition = Effect.fn('InMemoryFeedStore.getLastPosition')(
    (): Effect.Effect<number | null> =>
      Effect.sync(() => {
        const positioned = this._blocks.filter((b) => b.position !== null);
        if (positioned.length === 0) return null;
        return Math.max(...positioned.map((b) => b.position!));
      }),
  );
}
