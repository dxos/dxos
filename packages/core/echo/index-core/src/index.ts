//
// Copyright 2025 DXOS.org
//

export { type DataSourceCursor, type IndexDataSource } from './data-source.ts';
export { IndexEngine, type IndexingResult } from './index-engine.ts';
export { IndexedObjectSource } from './indexed-object-source.ts';
export { type IndexCursor, IndexTracker } from './index-tracker.ts';
export { ConvergenceKeyIntentStore } from './convergence-key-intent-store.ts';
export { ActivityIndex, type ActivityRow } from './indexes/activity-index.ts';
export { type ChangeSummary, type DocumentActivity, type Index, type IndexerObject } from './indexes/interface.ts';
export { FtsIndex, type FtsQuery, buildFtsCondition } from './indexes/fts-index.ts';
export { ObjectSnapshotIndex } from './indexes/object-snapshot-index.ts';
export {
  type EntityMeta,
  EntityMetaIndex,
  type QueueRef,
  type QueueWindow,
  buildQueueWindow,
  buildSourceCondition,
  buildTypeDxnCondition,
} from './indexes/entity-meta-index.ts';
export { localEntityId } from './entity-ids.ts';
export {
  type Referrer,
  type ReverseRef,
  ReverseRefIndex,
  type ReverseRefQuery,
  referenceIndexKey,
} from './indexes/reverse-ref-index.ts';
export { type EntityPropPath, EscapedPropPath, SQL_MAX_BOUND_VARIABLES, normalizePropPath } from './utils.ts';
