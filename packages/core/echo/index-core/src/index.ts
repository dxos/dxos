//
// Copyright 2025 DXOS.org
//

export { type DataSourceCursor, type IndexDataSource } from './data-source.ts';
export { IndexEngine, type IndexingResult } from './index-engine.ts';
export { IndexedObjectSource } from './indexed-object-source.ts';
export { type IndexCursor, IndexTracker } from './index-tracker.ts';
export { ConvergenceKeyIntentStore } from './convergence-key-intent-store.ts';
export { type Index, type IndexerObject } from './indexes/interface.ts';
export { FtsIndex, type FtsQuery } from './indexes/fts-index.ts';
export { ObjectSnapshotIndex } from './indexes/object-snapshot-index.ts';
export { type EntityMeta, EntityMetaIndex, type QueueRef, type QueueWindow } from './indexes/entity-meta-index.ts';
export {
  type Referrer,
  type ReverseRef,
  ReverseRefIndex,
  type ReverseRefQuery,
  referenceIndexKey,
} from './indexes/reverse-ref-index.ts';
export { type EntityPropPath, EscapedPropPath, SQL_MAX_BOUND_VARIABLES } from './utils.ts';
