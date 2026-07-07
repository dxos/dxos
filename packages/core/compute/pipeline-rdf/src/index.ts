//
// Copyright 2026 DXOS.org
//

export * as Type from './types';
export * from './fact-graph';
export * from './pipeline';
export * from './stages';
export * from './fact-store';
export * from './errors';
export * from './nl-to-query';

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
