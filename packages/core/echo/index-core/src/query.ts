//
// Copyright 2026 DXOS.org
//

// Query-building helpers without `IndexEngine`, which the barrel reaches and only the worker runs.
export { buildFtsCondition } from './indexes/fts-index.ts';
export {
  type EntityMeta,
  type QueueRef,
  type QueueWindow,
  buildQueueWindow,
  buildSourceCondition,
  buildTypeDxnCondition,
} from './indexes/entity-meta-index.ts';
export { referenceIndexKey } from './indexes/reverse-ref-index.ts';
export { type EntityPropPath, EscapedPropPath, normalizePropPath } from './utils.ts';
