//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import type { RDF } from '@dxos/pipeline-rdf';

/** A subject or object; a struct of optionals because ECHO stores no non-discriminated unions. */
export const StoredTerm = Schema.Struct({
  /** Normalized entity slug or IRI resolving to an ECHO object. */
  entity: Schema.optional(Schema.String),
  /** Display form of an entity. */
  label: Schema.optional(Schema.String),
  literal: Schema.optional(Schema.String),
});
export interface StoredTerm extends Schema.Schema.Type<typeof StoredTerm> {}

/** FactBank factuality values, as in pipeline-rdf. */
export const FactualityValue = Schema.Literals(['CT+', 'CT-', 'PR+', 'PR-', 'PS+', 'PS-', 'CTu', 'Uu']);
export type FactualityValue = Schema.Schema.Type<typeof FactualityValue>;

export const Polarity = Schema.Literals(['+', '-', '?']);
export type Polarity = Schema.Schema.Type<typeof Polarity>;

export const Force = Schema.Literals(['assertive', 'directive', 'commissive', 'expressive']);
export type Force = Schema.Schema.Type<typeof Force>;

export const Mood = Schema.Literals(['declarative', 'interrogative', 'imperative']);
export type Mood = Schema.Schema.Type<typeof Mood>;

/**
 * One extracted proposition: the feed item the brain indexes. A flattening of pipeline-rdf's `Fact`
 * (see `fromFact` / `toFact`), keyed by `id` in every relation it encodes to.
 */
export const FactTuple = Schema.Struct({
  id: Schema.String,
  subject: StoredTerm,
  predicate: Schema.String,
  object: StoredTerm,
  validFrom: Schema.optional(Schema.String),
  /** A status's horizon; expired facts are filtered, never deleted. */
  validTo: Schema.optional(Schema.String),
  quote: Schema.optional(Schema.String),
  factuality: FactualityValue,
  polarity: Polarity,
  confidence: Schema.optional(Schema.Number),
  nature: Schema.optional(Schema.Literals(['epistemic', 'aleatory'])),
  /** `assertive` when the source performed no other speech act. */
  force: Force,
  mood: Schema.optional(Mood),
  addressee: Schema.optional(Schema.String),
  /** DXN of the speaker. */
  speaker: Schema.optional(Schema.String),
  /** DXN of the message (or URL). */
  source: Schema.String,
  /** When it was said (ISO). */
  saidAt: Schema.String,
  span: Schema.optional(Schema.Struct({ start: Schema.Number, end: Schema.Number })),
  /** The tuples a correction derives from. */
  supersedes: Schema.optional(Schema.Array(Schema.String)),
  /** When it was extracted (ISO). */
  recordedAt: Schema.String,
  extractor: Schema.Struct({ id: Schema.String, model: Schema.String, version: Schema.String }),
  sourceHash: Schema.String,
  /** Extraction pass id, so a pass's facts can be grouped or replayed. */
  pass: Schema.String,
});
export interface FactTuple extends Schema.Schema.Type<typeof FactTuple> {}

/** The value a term contributes to a relation: the entity slug, else the literal, else the label. */
export const termValue = (term: StoredTerm): string => term.entity ?? term.literal ?? term.label ?? '';

/** Flattens a pipeline-rdf `Fact`; `pass` is the only field the fact does not carry. */
export const fromFact = (fact: RDF.Fact, options: { pass: string }): FactTuple => {
  const { assertion, factuality, illocution, attribution } = fact;
  return {
    id: fact.id,
    subject: fromTerm(assertion.subject),
    predicate: assertion.predicate,
    object: fromTerm(assertion.object),
    ...(assertion.validFrom !== undefined ? { validFrom: assertion.validFrom } : {}),
    ...(assertion.validTo !== undefined ? { validTo: assertion.validTo } : {}),
    ...(assertion.quote !== undefined ? { quote: assertion.quote } : {}),
    factuality: factuality.value,
    polarity: factuality.polarity,
    ...(factuality.confidence !== undefined ? { confidence: factuality.confidence } : {}),
    ...(factuality.nature !== undefined ? { nature: factuality.nature } : {}),
    force: illocution?.force ?? 'assertive',
    ...(illocution?.mood !== undefined ? { mood: illocution.mood } : {}),
    ...(illocution?.addressee !== undefined ? { addressee: illocution.addressee } : {}),
    ...(attribution.agent !== undefined ? { speaker: attribution.agent } : {}),
    source: attribution.source,
    saidAt: attribution.generatedAtTime,
    ...(attribution.span !== undefined ? { span: attribution.span } : {}),
    ...(attribution.wasDerivedFrom !== undefined ? { supersedes: attribution.wasDerivedFrom } : {}),
    recordedAt: fact.recordedAt,
    extractor: fact.extractor,
    sourceHash: fact.sourceHash,
    pass: options.pass,
  };
};

/**
 * Restores the pipeline-rdf `Fact`. Lossless for any `fromFact` result, except that an explicit
 * bare `{ force: 'assertive' }` illocution comes back absent, which pipeline-rdf reads identically.
 */
export const toFact = (tuple: FactTuple): RDF.Fact => {
  const illocution =
    tuple.force !== 'assertive' || tuple.mood !== undefined || tuple.addressee !== undefined
      ? {
          force: tuple.force,
          ...(tuple.mood !== undefined ? { mood: tuple.mood } : {}),
          ...(tuple.addressee !== undefined ? { addressee: tuple.addressee } : {}),
        }
      : undefined;
  return {
    id: tuple.id,
    assertion: {
      subject: toTerm(tuple.subject),
      predicate: tuple.predicate,
      object: toTerm(tuple.object),
      ...(tuple.validFrom !== undefined ? { validFrom: tuple.validFrom } : {}),
      ...(tuple.validTo !== undefined ? { validTo: tuple.validTo } : {}),
      ...(tuple.quote !== undefined ? { quote: tuple.quote } : {}),
    },
    factuality: {
      value: tuple.factuality,
      polarity: tuple.polarity,
      ...(tuple.confidence !== undefined ? { confidence: tuple.confidence } : {}),
      ...(tuple.nature !== undefined ? { nature: tuple.nature } : {}),
    },
    ...(illocution ? { illocution } : {}),
    attribution: {
      ...(tuple.speaker !== undefined ? { agent: tuple.speaker } : {}),
      source: tuple.source,
      generatedAtTime: tuple.saidAt,
      ...(tuple.supersedes !== undefined ? { wasDerivedFrom: tuple.supersedes } : {}),
      ...(tuple.span !== undefined ? { span: tuple.span } : {}),
    },
    recordedAt: tuple.recordedAt,
    extractor: tuple.extractor,
    sourceHash: tuple.sourceHash,
  };
};

const fromTerm = (term: RDF.Term): StoredTerm =>
  'entity' in term
    ? { entity: term.entity, ...(term.label !== undefined ? { label: term.label } : {}) }
    : { literal: term.literal };

/** A label-only term (never produced by `fromFact`) becomes a literal. */
const toTerm = (term: StoredTerm): RDF.Term =>
  term.entity !== undefined
    ? { entity: term.entity, ...(term.label !== undefined ? { label: term.label } : {}) }
    : { literal: term.literal ?? term.label ?? '' };
