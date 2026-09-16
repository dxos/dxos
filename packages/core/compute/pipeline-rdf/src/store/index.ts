//
// Copyright 2026 DXOS.org
//

export * from './fact-graph.ts';
export * from './fact-store.ts';
export * as FactStoreLive from './fact-store-live.ts';

// The public query type lives with the sparql internals but is part of the store's surface.
export { type SemanticQuery } from '../internal/sparql/query-builder.ts';
