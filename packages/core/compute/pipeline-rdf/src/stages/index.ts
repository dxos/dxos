//
// Copyright 2026 DXOS.org
//

export * from './extract-facts';
export * from './index-facts';
export * from './normalize-predicates';

// Extraction primitives that consumers compose with (the prompt/parse helpers live with the
// extraction stage's internal implementation; ExtractDocument/ExtractOptions are in the RDF types).
export {
  DEFAULT_EXTRACTION_RULES,
  ExtractedFact,
  buildExtractionPrompt,
  parseExtractPayload,
} from '../internal/stages/extract';
