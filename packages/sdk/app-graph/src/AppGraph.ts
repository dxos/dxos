//
// Copyright 2023 DXOS.org
//

//
// The `@dxos/app-graph/Graph` surface: the vocabulary, the store's public entry points, and the
// operations. Split across modules so the store's implementation is not part of what consumers read.
//

export * from './AppGraphTypes';
export * from './AppGraphOps';
export { getGraph, getInternal, make, relationFromKey, relationKey } from './AppGraphStore';
