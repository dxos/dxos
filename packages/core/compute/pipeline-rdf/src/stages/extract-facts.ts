//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { Stage } from '@dxos/pipeline';

import { type SemanticIndexError } from '../errors.ts';
import { chunk } from '../internal/stages/chunk.ts';
import { DEFAULT_MODEL, extractChunk } from '../internal/stages/extract.ts';
import { hashText } from '../internal/stages/reconcile.ts';
import { type ExtractDocument, type ExtractOptions, type Fact, Graph } from '../types/index.ts';

const EMAIL = /^(?:mailto:)?([^\s@]+@[^\s@]+\.[^\s@]+)$/i;
const URL_PATTERN = /^https?:\/\/\S+$/i;

// Distinct surface forms that slug identically merge; linking a slug to an ECHO object is `resolveEntity`'s job.
/**
 * Normalize a surface form (subject/object label, or an author token) to its canonical entity id: an email address
 * as its `mailto:` IRI, a web address as itself, anything else as a slug. Consumers that join against
 * `attribution.agent` / entity ids MUST apply this — the stored value is the normalized form, not the raw label
 * (e.g. `discord-user:123` → `discord-user-123`). Idempotent.
 */
export const normalizeEntityId = (label: string) => {
  const trimmed = label.trim();
  const email = EMAIL.exec(trimmed);
  if (email) {
    return `mailto:${email[1].toLowerCase()}`;
  }
  if (URL_PATTERN.test(trimmed)) {
    return trimmed;
  }
  const normalized = trimmed.toLowerCase();
  const value = normalized.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return value || `entity-${hashText(normalized)}`;
};

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
 * {@link Fact}; touches neither the {@link FactStore} nor any cursor, so it can generate facts
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
    const docFacts: Fact[] = [];
    // The graph label the model gave each statement; statements that also share provenance share a graph.
    const labels = new Map<Fact, string>();
    for (const chunkText of chunks) {
      const payload = yield* extractChunk({ ...doc, text: chunkText }, options);
      for (const candidate of payload.facts) {
        // Drop ungrounded propositions before they become facts.
        if (!isGrounded(candidate.subject) || !isGrounded(candidate.object)) {
          continue;
        }

        // Speech act: a non-assertive force, or a non-declarative mood (interrogative/imperative ⇒
        // directive), records an `illocution`; a plain assertion (the default) leaves it absent.
        const illocution =
          candidate.force && candidate.force !== 'assertive'
            ? { force: candidate.force, ...(candidate.mood ? { mood: candidate.mood } : {}) }
            : candidate.mood && candidate.mood !== 'declarative'
              ? { force: 'directive' as const, mood: candidate.mood }
              : undefined;

        const fact: Fact = {
          // Replaced by the statement's id once the facts are placed in their graphs below.
          id: '',
          assertion: {
            subject: {
              kind: 'entity',
              entity: normalizeEntityId(candidate.subject),
              label: candidate.subject.trim(),
              ...(candidate.subjectType ? { type: candidate.subjectType } : {}),
            },
            predicate: candidate.predicate,
            object: {
              kind: 'entity',
              entity: normalizeEntityId(candidate.object),
              label: candidate.object.trim(),
              ...(candidate.objectType ? { type: candidate.objectType } : {}),
            },
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
          ...(illocution ? { illocution } : {}),
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
        labels.set(fact, candidate.graph ?? '');
      }
    }
    return Graph.assign(docFacts, { name: (fact) => `${doc.source}#${hash}#${labels.get(fact) ?? ''}` });
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
 * touching the {@link FactStore} or any cursor — only an {@link AiService} in context.
 */
export const extractFactsStage = (
  options?: ExtractOptions,
): Stage.Stage<ExtractDocument, DocumentFacts, SemanticIndexError, AiService.AiService> =>
  Stage.map('extract-facts', (doc: ExtractDocument) =>
    extractDocFacts(doc, options).pipe(Effect.map((facts) => ({ doc, facts }))),
  );
