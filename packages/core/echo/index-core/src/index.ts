//
// Copyright 2025 DXOS.org
//

export { type DataSourceCursor, type IndexDataSource } from './data-source.ts';
export {
  IndexEngine,
  type IndexEngineOptions,
  type IndexingResult,
  type IndexTransactionLimits,
} from './index-engine.ts';
export { IndexedObjectSource } from './indexed-object-source.ts';
export { type IndexCursor, IndexTracker } from './index-tracker.ts';
export { ConvergenceKeyIntentStore } from './convergence-key-intent-store.ts';
export { FeedOptionsIntentStore } from './feed-options-intent-store.ts';
export { type ConvergenceKeyIntent, type FeedOptionsIntent, type IndexerIntent } from './indexer-intent.ts';
export { ActivityIndex, type ActivityRow } from './indexes/activity-index.ts';
export { type ChangeSummary, type DocumentActivity, type Index, type IndexerObject } from './indexes/interface.ts';
export { FtsIndex, type FtsQuery, buildFtsCondition } from './indexes/fts-index.ts';
export { type ObjectBacking, type ObjectSnapshot, ObjectSnapshotIndex } from './indexes/object-snapshot-index.ts';
export {
  type EntityMeta,
  EntityMetaIndex,
  type QueueRef,
  type QueueWindow,
  buildQueueWindow,
  buildSourceCondition,
  buildTypeDxnCondition,
  queueBranchesOf,
} from './indexes/entity-meta-index.ts';
export { localEntityId } from './entity-ids.ts';
export { type Referrer, type ReverseRef, ReverseRefIndex, type ReverseRefQuery } from './indexes/reverse-ref-index.ts';
export { type EntityPropPath, SQL_MAX_BOUND_VARIABLES, normalizePropPath } from './utils.ts';
