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
export { type Index, type IndexerObject } from './indexes/interface.ts';
export { FtsIndex, type FtsQuery } from './indexes/fts-index.ts';
export { type EntityMeta, EntityMetaIndex, type QueueWindow } from './indexes/entity-meta-index.ts';
export {
  type ReverseRef,
  ReverseRefIndex,
  type ReverseRefQuery,
  referenceIndexKey,
} from './indexes/reverse-ref-index.ts';
export { type EntityPropPath, EscapedPropPath } from './utils.ts';
