//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type AiService } from '@dxos/ai';
import { Pipeline, Stage } from '@dxos/pipeline';

import { SemanticIndexError } from './errors';
import { normalizePredicate } from './internal/sparql/normalize-predicate';
import { chunk } from './internal/stages/chunk';
import { DEFAULT_MODEL, type ExtractDocument, type ExtractOptions, extractChunk } from './internal/stages/extract';
import { hashText } from './internal/stages/reconcile';
import { SemanticStore } from './SemanticStore';
import { type Fact } from './types';

export { DEFAULT_EXTRACTION_RULES, buildExtractionPrompt } from './internal/stages/extract';
export type { ExtractDocument, ExtractOptions } from './internal/stages/extract';

// PROVISIONAL v1 entity resolution: distinct surface forms that normalize identically will merge,
// and there is no linking to real ECHO objects yet. Not the final identity scheme.
/**
 * Normalize a surface form (subject/object label, or an author token) to its canonical entity id.
 * Consumers that join against `attribution.agent` / entity ids MUST apply this — the stored value is
 * the normalized form, not the raw label (e.g. `discord-user:123` → `discord-user-123`). Idempotent.
 */
export const normalizeEntityId = (label: string) => {
  const normalized = label.trim().toLowerCase();
  const value = normalized.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return value || `entity-${hashText(normalized)}`;
};
const factId = (source: string, hash: string, index: number) => `${source}#${hash}#${index}`;

/**
 * Whether a subject/object label is groundable. The model emits the literal `unknown` (or an empty
 * string) when it can't resolve a referent — typically an unbound pronoun ("we"/"it") — and a fact
 * whose subject or object is unknown is noise, not a proposition.
 */
const isGrounded = (label: string) => {
  const value = label.trim().toLowerCase();
  return value.length > 0 && value !== 'unknown';
};

/**
 * Extract → link (slug) facts for a single document. Pure derivation: chunk → LLM extract → map to
 * {@link Fact}; touches neither the {@link SemanticStore} nor any cursor, so it can generate facts
 * from a raw document with only an {@link AiService} in context (e.g. a UI preview).
 */
export const extractDocFacts = (
  doc: ExtractDocument,
  options?: ExtractOptions,
): Effect.Effect<Fact[], SemanticIndexError, AiService.AiService> =>
  Effect.gen(function* () {
    // Transaction (ingest) time captured via the Effect Clock so the derivation stays referentially
    // transparent under TestClock.
    const recordedAt = new Date(yield* Clock.currentTimeMillis).toISOString();
    const hash = hashText(doc.text);
    const chunks = chunk(doc.text);
    let index = 0;
    const docFacts: Fact[] = [];
    for (const chunkText of chunks) {
      const payload = yield* extractChunk({ ...doc, text: chunkText }, options);
      for (const candidate of payload.facts) {
        // Drop ungrounded propositions before they become facts.
        if (!isGrounded(candidate.subject) || !isGrounded(candidate.object)) {
          continue;
        }

        const fact: Fact = {
          id: factId(doc.source, hash, index++),
          assertion: {
            subject: { entity: normalizeEntityId(candidate.subject), label: candidate.subject.trim() },
            predicate: candidate.predicate,
            object: { entity: normalizeEntityId(candidate.object), label: candidate.object.trim() },
            ...(candidate.validFrom ? { validFrom: candidate.validFrom } : {}),
            ...(candidate.validTo ? { validTo: candidate.validTo } : {}),
            ...(candidate.quote ? { quote: candidate.quote } : {}),
          },
          factuality: {
            value: candidate.factuality,
            polarity: candidate.polarity,
            ...(candidate.confidence !== undefined ? { confidence: candidate.confidence } : {}),
            ...(candidate.nature ? { nature: candidate.nature } : {}),
          },
          attribution: {
            ...(doc.author ? { agent: normalizeEntityId(doc.author) } : {}),
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
  options?: ExtractOptions,
): Effect.Effect<Fact[], SemanticIndexError, AiService.AiService> =>
  Effect.forEach(docs, (doc) => extractDocFacts(doc, options)).pipe(Effect.map((arrays) => arrays.flat()));

/** Output of the fact stages: the source document together with the facts derived from it. */
export type DocumentFacts = {
  readonly doc: ExtractDocument;
  readonly facts: readonly Fact[];
};

/**
 * Pure extraction stage: derives {@link Fact}s per document via {@link extractDocFacts} without
 * touching the {@link SemanticStore} or any cursor — only an {@link AiService} in context.
 */
export const extractFactsStage = (
  options?: ExtractOptions,
): Stage.Stage<ExtractDocument, DocumentFacts, SemanticIndexError, AiService.AiService> =>
  Stage.map('extract-facts', (doc: ExtractDocument) =>
    extractDocFacts(doc, options).pipe(Effect.map((facts) => ({ doc, facts }))),
  );

/**
 * Indexing stage: extract → link (slug) → persist into the {@link SemanticStore}, building the fact
 * database subsequent stages can query from context. Incremental: a document whose content hash
 * matches the stored cursor is skipped entirely (no LLM call, no duplicate facts) and dropped from
 * the stream. A CHANGED source currently appends new competing facts (append-only model) and
 * advances the cursor; deleting/superseding the prior facts from that source is deferred (v1).
 */
export const indexFactsStage = (
  options?: ExtractOptions,
): Stage.Stage<ExtractDocument, DocumentFacts, SemanticIndexError, SemanticStore | AiService.AiService> =>
  Stage.map('index-facts', (doc: ExtractDocument) =>
    Effect.gen(function* () {
      const store = yield* SemanticStore;
      const hash = hashText(doc.text);
      const prev = yield* store.cursor(doc.source);
      if (prev === hash) {
        // Source is unchanged — skip extraction to avoid LLM work and duplicate facts.
        return undefined;
      }
      const facts = yield* extractDocFacts(doc, options);
      yield* store.putFacts(facts);
      yield* store.setCursor(doc.source, hash);
      return { doc, facts };
    }),
  );

export type NormalizeOptions = {
  /**
   * Synonym table: predicate (any inflection — keys are relation-key normalized) → canonical
   * predicate. E.g. `{ 'employed by': 'works at', 'works for': 'works at' }`.
   */
  readonly synonyms: Readonly<Record<string, string>>;
};

/**
 * Predicate-canonicalization stage: rewrites each fact's predicate to its canonical form when the
 * synonym table maps its relation key ({@link normalizePredicate}); unmapped predicates keep their
 * original surface form (query-time fuzzy matching already collapses inflection). This is the
 * write-time reconcile seam — vocabulary strategy (curated set vs embeddings) is deliberately left
 * to the caller-supplied table for now.
 */
export const normalizeFactsStage = (options: NormalizeOptions): Stage.Stage<DocumentFacts, DocumentFacts> => {
  const lookup = new Map(Object.entries(options.synonyms).map(([key, value]) => [normalizePredicate(key), value]));
  return Stage.map('normalize-predicates', ({ doc, facts }: DocumentFacts) =>
    Effect.succeed({
      doc,
      facts: facts.map((fact) => {
        const canonical = lookup.get(normalizePredicate(fact.assertion.predicate));
        return canonical === undefined || canonical === fact.assertion.predicate
          ? fact
          : { ...fact, assertion: { ...fact.assertion, predicate: canonical } };
      }),
    }),
  );
};

export const SemanticPipeline = {
  /**
   * Batch convenience over {@link indexFactsStage}: streams the documents through the indexing
   * stage and collects every persisted fact. Documents are processed in order with back pressure.
   */
  run: (
    docs: readonly ExtractDocument[],
    options?: ExtractOptions,
  ): Effect.Effect<Fact[], SemanticIndexError, SemanticStore | AiService.AiService> =>
    Effect.gen(function* () {
      const allFacts: Fact[] = [];
      yield* Stream.fromIterable(docs).pipe(
        indexFactsStage(options),
        Pipeline.run({ sink: ({ facts }) => Effect.sync(() => allFacts.push(...facts)) }),
      );
      return allFacts;
    }),
};
