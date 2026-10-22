//
// Copyright 2026 DXOS.org
//

export * from './extract-facts.ts';
export * from './index-facts.ts';
export * from './normalize-predicates.ts';

// Extraction primitives that consumers compose with (the prompt/parse helpers live with the
// extraction stage's internal implementation; ExtractDocument/ExtractOptions are in the RDF types).
export {
  DEFAULT_EXTRACTION_RULES,
  ExtractedFact,
  TRANSCRIPT_RULE,
  TranscriptFact,
  buildExtractionPrompt,
  parseExtractPayload,
  parseTranscriptPayload,
} from '../internal/stages/extract.ts';
