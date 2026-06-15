//
// Copyright 2025 DXOS.org
//

export {
  IndexEngine,
  type IndexDataSource,
  type DataSourceCursor,
  type IndexEngineParams,
  type IndexingResult,
} from './index-engine';
export { IndexTracker, type IndexCursor } from './index-tracker';
export { type IndexerObject, type Index } from './indexes/interface';
export { FtsIndex, type FtsQuery } from './indexes/fts-index';
export { EntityMetaIndex, type EntityMeta } from './indexes/entity-meta-index';
export { ReverseRefIndex, type ReverseRef, type ReverseRefQuery } from './indexes/reverse-ref-index';
export { EscapedPropPath, type EntityPropPath } from './utils';
