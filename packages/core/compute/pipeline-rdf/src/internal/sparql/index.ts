//
// Copyright 2026 DXOS.org
//

// Public query surface (re-exported at the package root); the sparql engine/mapping stay internal.
export { generateQuery } from './nl-to-query';
export { type SemanticQuery, buildSparql } from './query-builder';
export { parseSparqlToQuery } from './sparql-to-query';
