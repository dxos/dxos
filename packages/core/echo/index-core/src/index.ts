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
export { ActivityIndex, type ActivityRow } from './indexes/activity-index.ts';
export { type ChangeSummary, type DocumentActivity, type Index, type IndexerObject } from './indexes/interface.ts';
export { FtsIndex, type FtsQuery } from './indexes/fts-index.ts';
export { ObjectSnapshotIndex } from './indexes/object-snapshot-index.ts';
export { EntityMetaIndex } from './indexes/entity-meta-index.ts';
export { localEntityId } from './entity-ids.ts';
export { type Referrer, type ReverseRef, ReverseRefIndex, type ReverseRefQuery } from './indexes/reverse-ref-index.ts';
export { SQL_MAX_BOUND_VARIABLES } from './utils.ts';
export * from './query.ts';
