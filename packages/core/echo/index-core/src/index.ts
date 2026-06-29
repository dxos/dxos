//
// Copyright 2025 DXOS.org
//

export {
  type DataSourceCursor,
  type IndexDataSource,
  type IndexEngineParams,
  type IndexingResult,
  IndexEngine,
} from './index-engine';
export { type IndexCursor, IndexTracker } from './index-tracker';
export { type Index, type IndexerObject } from './indexes/interface';
export { type FtsQuery, FtsIndex } from './indexes/fts-index';
export { type EntityMeta, EntityMetaIndex } from './indexes/entity-meta-index';
export { type ReverseRef, type ReverseRefQuery, ReverseRefIndex } from './indexes/reverse-ref-index';
export { type EntityPropPath, EscapedPropPath } from './utils';
