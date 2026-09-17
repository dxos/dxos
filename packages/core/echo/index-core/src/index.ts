//
// Copyright 2025 DXOS.org
//

export {
  type DataSourceCursor,
  type IndexDataSource,
  IndexEngine,
  type IndexEngineParams,
  type IndexingResult,
} from './index-engine.ts';
export { type IndexCursor, IndexTracker } from './index-tracker.ts';
export { ConvergenceKeyIntentStore } from './convergence-key-intent-store.ts';
export { type Index, type IndexerObject } from './indexes/interface.ts';
export { FtsIndex, type FtsQuery, buildFtsCondition } from './indexes/fts-index.ts';
export {
  type EntityMeta,
  EntityMetaIndex,
  type QueueRef,
  type QueueWindow,
  buildQueueWindow,
  buildSourceCondition,
  buildTypeDxnCondition,
  localEntityId,
} from './indexes/entity-meta-index.ts';
export { ObjectDataIndex } from './indexes/object-data-index.ts';
export {
  type Referrer,
  type ReverseRef,
  ReverseRefIndex,
  type ReverseRefQuery,
  referenceIndexKey,
} from './indexes/reverse-ref-index.ts';
export { type EntityPropPath, EscapedPropPath, normalizePropPath } from './utils.ts';
