//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';

import { SemanticIndexError } from './errors';
import { chunk } from './internal/stages/chunk';
import { DEFAULT_MODEL, type ExtractDocument, extractChunk } from './internal/stages/extract';
import { hashText } from './internal/stages/reconcile';
import { SemanticStore } from './SemanticStore';
import { type Fact } from './types';

export type { ExtractDocument } from './internal/stages/extract';

// PROVISIONAL v1 entity resolution: distinct surface forms that normalize identically will merge,
// and there is no linking to real ECHO objects yet. Not the final identity scheme.
const slug = (label: string) => {
  const normalized = label.trim().toLowerCase();
  const value = normalized.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return value || `entity-${hashText(normalized)}`;
};
const factId = (source: string, hash: string, index: number) => `${source}#${hash}#${index}`;

/**
 * Extract → link (slug) facts for a single document. Pure derivation: chunk → LLM extract → map to
 * {@link Fact}; touches neither the {@link SemanticStore} nor any cursor, so it can generate facts
 * from a raw document with only an {@link AiService} in context (e.g. a UI preview).
 */
export const extractDocFacts = (doc: ExtractDocument): Effect.Effect<Fact[], SemanticIndexError, AiService.AiService> =>
  Effect.gen(function* () {
    // Transaction (ingest) time captured via the Effect Clock so the derivation stays referentially
    // transparent under TestClock.
    const recordedAt = new Date(yield* Clock.currentTimeMillis).toISOString();
    const hash = hashText(doc.text);
    const chunks = chunk(doc.text);
    let index = 0;
    const docFacts: Fact[] = [];
    for (const chunkText of chunks) {
      const payload = yield* extractChunk({ ...doc, text: chunkText });
      for (const candidate of payload.facts) {
        const fact: Fact = {
          id: factId(doc.source, hash, index++),
          assertion: {
            subject: { entity: slug(candidate.subject) },
            predicate: candidate.predicate,
            object: { entity: slug(candidate.object) },
            ...(candidate.validFrom ? { validFrom: candidate.validFrom } : {}),
            ...(candidate.validTo ? { validTo: candidate.validTo } : {}),
            ...(candidate.quote ? { quote: candidate.quote } : {}),
          },
          valence: {
            factuality: candidate.factuality,
            polarity: candidate.polarity,
            ...(candidate.confidence !== undefined ? { confidence: candidate.confidence } : {}),
            ...(candidate.nature ? { nature: candidate.nature } : {}),
          },
          attribution: {
            ...(doc.author ? { agent: slug(doc.author) } : {}),
            source: doc.source,
            generatedAtTime: doc.date ?? recordedAt,
          },
          recordedAt,
          extractor: { id: 'default', model: DEFAULT_MODEL, version: '1' },
          sourceHash: hash,
        };
        docFacts.push(fact);
      }
    }
    return docFacts;
  });

/**
 * Store-free fact generation over a batch of documents. Runs {@link extractDocFacts} per document
 * and flattens the results; no persistence and no incremental cursor skipping.
 */
export const extractFacts = (
  docs: readonly ExtractDocument[],
): Effect.Effect<Fact[], SemanticIndexError, AiService.AiService> =>
  Effect.forEach(docs, extractDocFacts).pipe(Effect.map((arrays) => arrays.flat()));

export const SemanticPipeline = {
  /** Extract → link (slug) → persist for each document. Incremental: documents whose content hash
   *  matches the stored cursor are skipped entirely (no LLM call, no duplicate facts).
   *
   *  A CHANGED source currently appends new competing facts (append-only model) and advances
   *  the cursor. Deleting/superseding the prior facts from that source is deferred (v1).
   */
  run: (
    docs: readonly ExtractDocument[],
  ): Effect.Effect<Fact[], SemanticIndexError, SemanticStore | AiService.AiService> =>
    Effect.gen(function* () {
      const store = yield* SemanticStore;
      const allFacts: Fact[] = [];
      for (const doc of docs) {
        const hash = hashText(doc.text);
        const prev = yield* store.cursor(doc.source);
        if (prev === hash) {
          // Source is unchanged — skip extraction to avoid LLM work and duplicate facts.
          continue;
        }
        const docFacts = yield* extractDocFacts(doc);
        yield* store.putFacts(docFacts);
        yield* store.setCursor(doc.source, hash);
        allFacts.push(...docFacts);
      }
      return allFacts;
    }),
};
