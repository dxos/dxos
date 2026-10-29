//
// Copyright 2026 DXOS.org
//

import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { Stage } from '@dxos/pipeline';

import { type SemanticIndexError } from '../errors.ts';
import { chunk } from '../internal/stages/chunk.ts';
import {
  DEFAULT_MODEL,
  type ExtractedFact,
  type TranscriptFact,
  extractChunk,
  extractTranscript,
} from '../internal/stages/extract.ts';
import { hashText } from '../internal/stages/reconcile.ts';
import {
  type EntityTerm,
  type ExtractDocument,
  type ExtractOptions,
  type Fact,
  Graph,
  type KnownEntity,
  Ontology,
} from '../types/index.ts';

const EMAIL = /^(?:mailto:)?([^\s@]+@[^\s@]+\.[^\s@]+)$/i;
const URL_PATTERN = /^https?:\/\/\S+$/i;

// Distinct surface forms that slug identically merge; linking a slug to an ECHO object is `resolveEntity`'s job.
/**
 * Normalize a surface form (subject/object label, or an author token) to its canonical entity id: an email address
 * as its `mailto:` IRI, a web address as itself, anything else as a slug. Consumers that join against
 * `attribution.agent` / entity ids MUST apply this - the stored value is the normalized form, not the raw label
 * (e.g. `discord-user:123` -> `discord-user-123`). Idempotent.
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
 * string) when it can't resolve a referent - typically an unbound pronoun ("we"/"it") - and a fact
 * whose subject or object is unknown is noise, not a proposition.
 */
const isGrounded = (label: string) => {
  const value = label.trim().toLowerCase();
  return value.length > 0 && value !== 'unknown';
};

const nameKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

/** The known entities by every name they go by; a name two entities share names neither. */
const indexEntities = (entities: ReadonlyArray<KnownEntity>): Map<string, KnownEntity> => {
  const byName = new Map<string, KnownEntity[]>();
  for (const entity of entities) {
    for (const name of [entity.label, ...(entity.aliases ?? [])]) {
      byName.set(nameKey(name), [...(byName.get(nameKey(name)) ?? []), entity]);
    }
  }
  return new Map(
    [...byName].flatMap(([name, matches]) =>
      new Set(matches.map(({ iri }) => iri)).size === 1 ? [[name, matches[0]] as const] : [],
    ),
  );
};

/**
 * The term for a mention: a known entity's stable IRI when the mention names one, else its slug, which the store keeps
 * local to the mention's graph.
 */
const entityTerm = (surface: string, type: EntityTerm['type'], known: ReadonlyMap<string, KnownEntity>): EntityTerm => {
  const entity = known.get(nameKey(surface));
  const kind = type ?? entity?.type;
  return {
    kind: 'entity',
    entity: entity?.iri ?? normalizeEntityId(surface),
    label: surface.trim(),
    ...(kind ? { type: kind } : {}),
  };
};

/** What every fact derived from one extraction request shares, whichever document it lands on. */
type FactContext = {
  readonly recordedAt: string;
  readonly ontology: Ontology.Ontology;
  readonly known: ReadonlyMap<string, KnownEntity>;
};

const factContext = (options: ExtractOptions | undefined) =>
  Effect.gen(function* () {
    // Transaction (ingest) time captured via the Effect Clock so the derivation stays referentially
    // transparent under TestClock.
    const recordedAt = new Date(yield* Clock.currentTimeMillis).toISOString();
    return {
      recordedAt,
      ontology: options?.ontology ?? Ontology.DEFAULT,
      known: indexEntities(options?.entities ?? []),
    } satisfies FactContext;
  });

/** A candidate the model emitted, as a {@link Fact} attributed to `doc`; `undefined` when it is ungrounded. */
const toFact = (candidate: ExtractedFact, doc: ExtractDocument, context: FactContext): Fact | undefined => {
  // Drop ungrounded propositions before they become facts.
  if (!isGrounded(candidate.subject) || !isGrounded(candidate.object)) {
    return undefined;
  }

  // Speech act: a non-assertive force, or a non-declarative mood (interrogative/imperative =>
  // directive), records an `illocution`; a plain assertion (the default) leaves it absent.
  const illocution =
    candidate.force && candidate.force !== 'assertive'
      ? { force: candidate.force, ...(candidate.mood ? { mood: candidate.mood } : {}) }
      : candidate.mood && candidate.mood !== 'declarative'
        ? { force: 'directive' as const, mood: candidate.mood }
        : undefined;

  // A listed predicate is stored under its IRI and label; any other is minted in the ontology's namespace and
  // keeps the definition the extractor gave it.
  const listed = context.ontology.find(candidate.predicate);
  const predicate = listed ?? context.ontology.resolve(candidate.predicate);
  return {
    // Replaced by the statement's id once the facts are placed in their graphs.
    id: '',
    assertion: {
      subject: entityTerm(candidate.subject, candidate.subjectType, context.known),
      predicate: listed?.label ?? candidate.predicate.trim(),
      predicateIri: predicate.iri,
      ...(!listed && candidate.predicateDescription ? { predicateDescription: candidate.predicateDescription } : {}),
      object: entityTerm(candidate.object, candidate.objectType, context.known),
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
      generatedAtTime: doc.date ?? context.recordedAt,
    },
    recordedAt: context.recordedAt,
    extractor: { id: 'default', model: DEFAULT_MODEL, version: '1' },
    sourceHash: hashText(doc.text),
  };
};

/** Place one document's facts in their graphs: statements that share provenance and the model's graph label share one. */
const placeFacts = (
  doc: ExtractDocument,
  labelled: ReadonlyArray<readonly [Fact, string]>,
  ontology: Ontology.Ontology,
): Fact[] => {
  const labels = new Map(labelled);
  const hash = hashText(doc.text);
  return Graph.assign(
    labelled.map(([fact]) => fact),
    { name: (fact) => `${doc.source}#${hash}#${labels.get(fact) ?? ''}`, ontology },
  );
};

/**
 * Extract -> link (slug) facts for a single document. Pure derivation: chunk -> LLM extract -> map to
 * {@link Fact}; touches neither the {@link FactStore} nor any cursor, so it can generate facts
 * from a raw document with only an {@link AiService} in context (e.g. a UI preview).
 */
export const extractDocFacts = (
  doc: ExtractDocument,
  options?: ExtractOptions,
): Effect.Effect<Fact[], SemanticIndexError, AiService.AiService> =>
  Effect.gen(function* () {
    const context = yield* factContext(options);
    // The graph label the model gave each statement.
    const labelled: Array<readonly [Fact, string]> = [];
    for (const chunkText of chunk(doc.text)) {
      const payload = yield* extractChunk({ ...doc, text: chunkText }, options);
      for (const candidate of payload.facts) {
        const fact = toFact(candidate, doc, context);
        if (fact) {
          labelled.push([fact, candidate.graph ?? '']);
        }
      }
    }
    return placeFacts(doc, labelled, context.ontology);
  });

/**
 * Upper bound on one transcript request's message text (characters). Far above {@link chunk}'s per-document budget,
 * since a transcript exists to put a page of short messages in one request; at most one page of Discord's
 * 2000-character messages still splits over a few requests rather than overflowing the model's output.
 */
export const DEFAULT_MAX_TRANSCRIPT_CHARS = 12_000;

/** A document in a transcript, under the tag the model cites it by. */
type TaggedDoc = { readonly tag: string; readonly doc: ExtractDocument };

const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const renderEntry = ({ tag, doc }: TaggedDoc, text: string) =>
  `<message tag="${tag}" author="${escapeAttribute(doc.author ?? 'unknown')}" date="${escapeAttribute(doc.date ?? 'unknown')}">\n${text}\n</message>`;

/**
 * Pack the tagged documents, in order, into transcripts of at most `maxChars` of message text. A document longer than
 * that is split with {@link chunk}, each part under the document's own tag, so the existing chunking still bounds it.
 */
const packTranscripts = (
  tagged: readonly TaggedDoc[],
  maxChars: number,
): Array<{ readonly text: string; readonly docs: readonly TaggedDoc[] }> => {
  const transcripts: Array<{ text: string; docs: TaggedDoc[] }> = [];
  let entries: string[] = [];
  let docs: TaggedDoc[] = [];
  let size = 0;
  const flush = () => {
    if (entries.length > 0) {
      transcripts.push({ text: `Messages:\n${entries.join('\n\n')}`, docs });
      entries = [];
      docs = [];
      size = 0;
    }
  };
  for (const entry of tagged) {
    for (const part of chunk(entry.doc.text, maxChars)) {
      if (size > 0 && size + part.length > maxChars) {
        flush();
      }
      entries.push(renderEntry(entry, part));
      if (docs.at(-1) !== entry) {
        docs.push(entry);
      }
      size += part.length;
    }
  }
  flush();
  return transcripts;
};

const normalizeText = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();

// Accepts the forms models write a tag in: `m3`, `[m3]`, `M3`, or a bare `3`.
const normalizeTag = (tag: string) => {
  const value = tag
    .trim()
    .replace(/^\[|\]$/g, '')
    .trim()
    .toLowerCase();
  return /^\d+$/.test(value) ? `m${value}` : value;
};

/**
 * The document a transcript fact belongs to. The cited tag decides, unless the verbatim quote is absent from the
 * tagged message and found in exactly one other (a mis-cited tag); with no usable tag, the last message holding the
 * quote; failing both, the transcript's last message, the one the conversation had reached.
 */
const attribute = (candidate: TranscriptFact, docs: readonly TaggedDoc[]): TaggedDoc => {
  const tagged = candidate.message ? docs.find(({ tag }) => tag === normalizeTag(candidate.message ?? '')) : undefined;
  const quote = candidate.quote ? normalizeText(candidate.quote) : '';
  const quoted = quote.length > 0 ? docs.filter(({ doc }) => normalizeText(doc.text).includes(quote)) : [];
  if (tagged && (quoted.length !== 1 || quoted.includes(tagged))) {
    return tagged;
  }
  return quoted.at(-1) ?? tagged ?? docs[docs.length - 1];
};

/**
 * Extract facts for several documents (e.g. a page of chat messages) in as few model requests as fit: the documents
 * become one transcript, each message tagged with its author and date so references across them resolve, and every
 * fact is attributed back to the message it cites (see {@link TRANSCRIPT_RULE}), taking that message's source, author
 * and date. Pure derivation like {@link extractDocFacts}: no store, no cursor. Returns one entry per document, in
 * order, including documents that yielded no facts.
 */
export const extractTranscriptFacts = (
  docs: readonly ExtractDocument[],
  options?: ExtractOptions & { readonly maxTranscriptChars?: number },
): Effect.Effect<DocumentFacts[], SemanticIndexError, AiService.AiService> =>
  Effect.gen(function* () {
    const context = yield* factContext(options);
    const tagged = docs.map((doc, index): TaggedDoc => ({ tag: `m${index + 1}`, doc }));
    const labelled = new Map<TaggedDoc, Array<readonly [Fact, string]>>(tagged.map((entry) => [entry, []]));
    for (const transcript of packTranscripts(tagged, options?.maxTranscriptChars ?? DEFAULT_MAX_TRANSCRIPT_CHARS)) {
      const label = transcript.docs.map(({ doc }) => doc.source).join(',');
      const payload = yield* extractTranscript(transcript.text, label, options);
      for (const candidate of payload.facts) {
        const target = attribute(candidate, transcript.docs);
        const fact = toFact(candidate, target.doc, context);
        if (fact) {
          labelled.get(target)?.push([fact, candidate.graph ?? '']);
        }
      }
    }
    return tagged.map((entry) => ({
      doc: entry.doc,
      facts: placeFacts(entry.doc, labelled.get(entry) ?? [], context.ontology),
    }));
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
 * touching the {@link FactStore} or any cursor - only an {@link AiService} in context.
 */
export const extractFactsStage = (
  options?: ExtractOptions,
): Stage.Stage<ExtractDocument, DocumentFacts, SemanticIndexError, AiService.AiService> => {
  const vocabulary = growingOntology(options?.ontology);
  return Stage.map('extract-facts', (doc: ExtractDocument) =>
    extractDocFacts(doc, { ...options, ontology: vocabulary.current() }).pipe(
      Effect.tap((facts) => Effect.sync(() => vocabulary.learn(facts))),
      Effect.map((facts) => ({ doc, facts })),
    ),
  );
};

/**
 * The ontology a stage extracts with, grown by the predicates each document mints, so the next document is shown
 * them and reuses them instead of minting a variant. It lives as long as the stage.
 */
export const growingOntology = (initial: Ontology.Ontology = Ontology.DEFAULT) => {
  let ontology = initial;
  return {
    current: () => ontology,
    learn: (facts: readonly Fact[]) => {
      ontology = ontology.include(Graph.mintedPredicates(facts, ontology));
    },
  };
};
