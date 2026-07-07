//
// Copyright 2026 DXOS.org
//

export * as RDF from './types';

export * from './errors';
export * from './pipeline';
export * from './stages';
export * from './store';

// Public NL→query surface; the sparql engine/mapping remain internal (SemanticQuery via ./store).
export { buildSparql, generateQuery, parseSparqlToQuery } from './internal/sparql';
