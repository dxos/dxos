//
// Copyright 2026 DXOS.org
//

export * as Type from './types';

export * from './errors';
export * from './fact-graph';
export * from './fact-store';
export * from './nl-to-query';
export * from './pipeline';
export * from './stages';

// TODO(burdon): Namespace?
export { buildSparql } from './internal/sparql/query-builder';
export { normalizePredicate } from './internal/sparql/normalize-predicate';
export { parseSparqlToQuery } from './internal/sparql/sparql-to-query';
export {
  DEFAULT_EXTRACTION_RULES,
  ExtractedFact,
  buildExtractionPrompt,
  parseExtractPayload,
} from './internal/stages/extract';
export type { ExtractDocument, ExtractOptions } from './internal/stages/extract';
