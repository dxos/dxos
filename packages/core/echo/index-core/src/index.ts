//
// Copyright 2025 DXOS.org
//

export {
  type DataSourceCursor,
  type IndexDataSource,
  IndexEngine,
  type IndexEngineParams,
  type IndexingResult,
} from './index-engine';
export { type IndexCursor, IndexTracker } from './index-tracker';
export { ConvergenceKeyIntentStore } from './convergence-key-intent-store';
export { type Index, type IndexerObject } from './indexes/interface';
export { FtsIndex, type FtsQuery } from './indexes/fts-index';
export { type EntityMeta, EntityMetaIndex, type QueueWindow } from './indexes/entity-meta-index';
export { type ReverseRef, ReverseRefIndex, type ReverseRefQuery, referenceIndexKey } from './indexes/reverse-ref-index';
export { type EntityPropPath, EscapedPropPath } from './utils';
