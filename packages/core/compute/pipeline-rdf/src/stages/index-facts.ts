//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { Stage } from '@dxos/pipeline';

import { type SemanticIndexError } from '../errors.ts';
import { hashText } from '../internal/stages/reconcile.ts';
import { FactStore } from '../store/index.ts';
import { type ExtractDocument, type ExtractOptions, Ontology } from '../types/index.ts';
import { type DocumentFacts, extractDocFacts, extractTranscriptFacts } from './extract-facts.ts';

/**
 * Indexing stage: extract -> link (slug) -> persist into the {@link FactStore}, building the fact
 * database subsequent stages can query from context. Incremental: a document whose content hash
 * matches the stored cursor is skipped entirely (no LLM call, no duplicate facts) and dropped from
 * the stream. A CHANGED source currently appends new competing facts (append-only model) and
 * advances the cursor; deleting/superseding the prior facts from that source is deferred (v1).
 */
export const indexFactsStage = (
  options?: ExtractOptions,
): Stage.Stage<ExtractDocument, DocumentFacts, SemanticIndexError, FactStore | AiService.AiService> =>
  Stage.map('index-facts', (doc: ExtractDocument) =>
    Effect.gen(function* () {
      const store = yield* FactStore;
      const hash = hashText(doc.text);
      const prev = yield* store.cursor(doc.source);
      if (prev === hash) {
        // Source is unchanged - skip extraction to avoid LLM work and duplicate facts.
        return undefined;
      }
      // The predicates the store has learned are shown to the extractor, so each document reuses earlier ones.
      const ontology = (options?.ontology ?? Ontology.DEFAULT).include(yield* store.predicates());
      const facts = yield* extractDocFacts(doc, { ...options, ontology });
      yield* store.putFacts(facts);
      yield* store.setCursor(doc.source, hash);
      return { doc, facts };
    }),
  );

/** Options for batched indexing: extraction options plus how many documents share one transcript. */
export type IndexBatchOptions = ExtractOptions & {
  /** Documents per batch (default {@link DEFAULT_INDEX_BATCH_SIZE}). */
  readonly batchSize?: number;
  /** Upper bound on one transcript request's message text; longer batches split over several requests. */
  readonly maxTranscriptChars?: number;
};

/** Default documents per batch: one Discord page. */
export const DEFAULT_INDEX_BATCH_SIZE = 25;

/**
 * {@link indexFactsStage} over several documents at once: documents whose cursor matches their hash are skipped
 * (never sent to the model), the rest are extracted together through {@link extractTranscriptFacts} (one request per
 * transcript, not per document; a lone document makes the single-document request), their facts persisted, and only then each document's cursor advanced. Returns the
 * indexed documents with their facts, in input order; skipped documents are left out.
 */
export const indexFactsBatch = (
  docs: readonly ExtractDocument[],
  options?: Omit<IndexBatchOptions, 'batchSize'>,
): Effect.Effect<DocumentFacts[], SemanticIndexError, FactStore | AiService.AiService> =>
  Effect.gen(function* () {
    const store = yield* FactStore;
    const pending: ExtractDocument[] = [];
    for (const doc of docs) {
      if ((yield* store.cursor(doc.source)) !== hashText(doc.text)) {
        pending.push(doc);
      }
    }
    if (pending.length === 0) {
      return [];
    }
    const ontology = (options?.ontology ?? Ontology.DEFAULT).include(yield* store.predicates());
    // A lone document needs no transcript: the single-document request is the same one indexFactsStage makes.
    const results =
      pending.length === 1
        ? [{ doc: pending[0], facts: yield* extractDocFacts(pending[0], { ...options, ontology }) }]
        : yield* extractTranscriptFacts(pending, { ...options, ontology });
    yield* store.putFacts(results.flatMap(({ facts }) => facts));
    for (const { doc } of results) {
      yield* store.setCursor(doc.source, hashText(doc.text));
    }
    return results;
  });

/**
 * Batched {@link indexFactsStage}: groups up to `batchSize` documents and indexes each group with
 * {@link indexFactsBatch}, emitting one {@link DocumentFacts} per indexed document in order.
 */
export const indexFactsBatchStage = (
  options?: IndexBatchOptions,
): Stage.Stage<ExtractDocument, DocumentFacts, SemanticIndexError, FactStore | AiService.AiService> => {
  const { batchSize = DEFAULT_INDEX_BATCH_SIZE, ...extractOptions } = options ?? {};
  return Stage.batch('index-facts', { size: batchSize }, (docs: readonly ExtractDocument[]) =>
    indexFactsBatch(docs, extractOptions),
  );
};
