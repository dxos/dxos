import * as Effect from 'effect/Effect';
import { Block, FeedSyncMessage } from './protocol';

export interface FeedStore {
  append(blocks: Block[]): Effect.Effect<void, any, any>;
  getBlocks(range: FeedSyncMessage['requestRange']): Effect.Effect<Block[], any, any>;
  getUnpositionedBlocks(limit?: number): Effect.Effect<Block[], any, any>;
  getLastPosition(): Effect.Effect<number | null, any, any>;
}
