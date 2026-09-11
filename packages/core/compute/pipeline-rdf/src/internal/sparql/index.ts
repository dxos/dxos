//
// Copyright 2026 DXOS.org
//

// Public query surface (re-exported at the package root); the sparql engine/mapping stay internal.
export { generateQuery } from './nl-to-query.ts';
export { type SemanticQuery, buildSparql } from './query-builder.ts';
export { parseSparqlToQuery } from './sparql-to-query.ts';
