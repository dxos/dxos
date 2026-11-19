//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

//
// Identifiers. Branded so one kind of id cannot be passed for another; the encoded form stays a plain string, so
// facts stored before the brands existed still decode.
//

/** A statement's id, derived from its graph and the statement. */
export const FactId = Schema.String.pipe(Schema.brand('@dxos/echo-memory/FactId'));
export type FactId = Schema.Schema.Type<typeof FactId>;

/** The IRI of a named graph. */
export const GraphIri = Schema.String.pipe(Schema.brand('@dxos/echo-memory/GraphIri'));
export type GraphIri = Schema.Schema.Type<typeof GraphIri>;

/** An entity: an absolute IRI where one is known (`echo://…`, `did:…`, `mailto:…`, a URL), else a normalized slug. */
export const EntityKey = Schema.String.pipe(Schema.brand('@dxos/echo-memory/EntityKey'));
export type EntityKey = Schema.Schema.Type<typeof EntityKey>;

/** The item facts were read from, or a source read into facts: a DXN or another URI. */
export const SourceUri = Schema.String.pipe(Schema.brand('@dxos/echo-memory/SourceUri'));
export type SourceUri = Schema.Schema.Type<typeof SourceUri>;

//
// Terms.
//

export const EntityKind = Schema.Literals(['person', 'org', 'place', 'event', 'concept', 'thing']);
export type EntityKind = Schema.Schema.Type<typeof EntityKind>;

/** A reference to an entity: `entity` is its key, `label` the surface form kept for display. */
export const EntityTerm = Schema.Struct({
  kind: Schema.Literal('entity'),
  entity: EntityKey,
  label: Schema.optional(Schema.String),
  /** What sort of thing the extractor took it for. */
  type: Schema.optional(EntityKind),
});
export interface EntityTerm extends Schema.Schema.Type<typeof EntityTerm> {}

/** A literal value. */
export const LiteralTerm = Schema.Struct({
  kind: Schema.Literal('literal'),
  literal: Schema.String,
});
export interface LiteralTerm extends Schema.Schema.Type<typeof LiteralTerm> {}

/** A subject or object: an entity reference or a literal, tagged by `kind`. */
export const Term = Schema.Union([EntityTerm, LiteralTerm]);
export type Term = Schema.Schema.Type<typeof Term>;

/** A resolved entity. */
export const Entity = Schema.Struct({
  id: EntityKey,
  kind: EntityKind,
  label: Schema.String,
  aliases: Schema.Array(Schema.String),
  /** DXN of a canonical ECHO object, once resolved. */
  ref: Schema.optional(Schema.String),
});
export interface Entity extends Schema.Schema.Type<typeof Entity> {}

//
// The parts of a fact.
//

/** The proposition: subject, predicate, object, and when it holds in the world. */
export const Assertion = Schema.Struct({
  subject: Term,
  /** The predicate's label: the surface form, or the ontology's label once stored. */
  predicate: Schema.String,
  /** The predicate's IRI; resolved from `predicate` through the ontology when absent. */
  predicateIri: Schema.optional(Schema.String),
  /** What a minted predicate means, as its extractor defined it. */
  predicateDescription: Schema.optional(Schema.String),
  object: Term,
  /** ISO date from which the asserted state holds. */
  validFrom: Schema.optional(Schema.String),
  /** ISO date until which the asserted state holds. */
  validTo: Schema.optional(Schema.String),
  /** The source text it was read from. */
  quote: Schema.optional(Schema.String),
});
export interface Assertion extends Schema.Schema.Type<typeof Assertion> {}

/** FactBank values: a degree (CT certain, PR probable, PS possible) with a polarity, plus CTu and Uu (uncommitted). */
export const FactualityValue = Schema.Literals(['CT+', 'CT-', 'PR+', 'PR-', 'PS+', 'PS-', 'CTu', 'Uu']);
export type FactualityValue = Schema.Schema.Type<typeof FactualityValue>;

/** The speaker's epistemic commitment to the proposition. */
export const Factuality = Schema.Struct({
  value: FactualityValue,
  polarity: Schema.Literals(['+', '-', '?']),
  /** The extractor's confidence in its reading, 0..1. */
  confidence: Schema.optional(Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 0, maximum: 1 })))),
  nature: Schema.optional(Schema.Literals(['epistemic', 'aleatory'])),
});
export interface Factuality extends Schema.Schema.Type<typeof Factuality> {}

/** Searle's illocutionary forces, minus `declarative`. */
export const IllocutionaryForce = Schema.Literals(['assertive', 'directive', 'commissive', 'expressive']);
export type IllocutionaryForce = Schema.Schema.Type<typeof IllocutionaryForce>;

/** The speech act the source performed; `mood` tells a question from a request. */
export const Illocution = Schema.Struct({
  force: IllocutionaryForce,
  mood: Schema.optional(Schema.Literals(['declarative', 'interrogative', 'imperative'])),
  /** Who is asked to act or answer; the message's recipient when absent. */
  addressee: Schema.optional(Schema.String),
});
export interface Illocution extends Schema.Schema.Type<typeof Illocution> {}

/** PROV-O-named provenance. */
export const Attribution = Schema.Struct({
  /** Who said it. */
  agent: Schema.optional(EntityKey),
  /** The speaker's display name; `agent` stays the join key. */
  agentLabel: Schema.optional(Schema.String),
  source: SourceUri,
  /** When it was said (ISO). */
  generatedAtTime: Schema.String,
  wasDerivedFrom: Schema.optional(Schema.Array(Schema.String)),
  span: Schema.optional(Schema.Struct({ start: Schema.Number, end: Schema.Number })),
});
export interface Attribution extends Schema.Schema.Type<typeof Attribution> {}

//
// Fact.
//

/**
 * One statement and what is known about it. Statements that share their provenance live in one named graph
 * (`graph`), which carries that provenance once; a fact without a graph is the only statement of its own.
 */
export const Fact = Schema.Struct({
  id: FactId,
  graph: Schema.optional(GraphIri),
  assertion: Assertion,
  factuality: Factuality,
  /** Absent ⇒ assertive. */
  illocution: Schema.optional(Illocution),
  attribution: Attribution,
  /** When memory stored it (ISO transaction time). */
  recordedAt: Schema.String,
  extractor: Schema.Struct({ id: Schema.String, model: Schema.String, version: Schema.String }),
  /** Hash of the source content read, so a changed source is read again. */
  sourceHash: Schema.String,
  /** Extraction pass id, grouping the facts one run produced. */
  pass: Schema.optional(Schema.String),
  /** What sort of free-text memory the graph records (`preference`, `commitment`); absent for a fact. */
  kind: Schema.optional(Schema.String),
  /** Whether the speaker said it (`stated`) or the agent concluded it (`inferred`). */
  origin: Schema.optional(Schema.String),
  /** The graphs this one replaces. */
  supersedes: Schema.optional(Schema.Array(GraphIri)),
  /** The graphs this one withdraws. */
  retracts: Schema.optional(Schema.Array(GraphIri)),
});
export interface Fact extends Schema.Schema.Type<typeof Fact> {}

/** A fact before the id brands are applied: every id a plain string, as stored and as written by hand. */
export type Encoded = Schema.Codec.Encoded<typeof Fact>;

/** A term before the id brands are applied, as a hand-built fact's {@link Encoded} assertion holds it. */
export type EncodedTerm = Schema.Codec.Encoded<typeof Term>;

/** An entity term before the id brands are applied. */
export type EncodedEntityTerm = Schema.Codec.Encoded<typeof EntityTerm>;

/** Builds a fact from its plain form, applying the id brands; throws on a malformed fact. */
export const make: (fact: Encoded) => Fact = Schema.decodeSync(Fact);

/** {@link make} over a list, so a literal list of facts is still checked against {@link Encoded}. */
export const makeMany = (facts: readonly Encoded[]): Fact[] => facts.map((fact) => make(fact));

/** Decodes facts from their JSON form, applying the id brands; throws on a malformed fact. */
export const decode = Schema.decodeUnknownSync(Schema.Array(Fact));

//
// Ontology.
//

/** A predicate a memory knows, as its ontology graph describes it (RDFS / OWL / SKOS). */
export const PredicateEntry = Schema.Struct({
  iri: Schema.String,
  /** Lowercase shorthand rules use, e.g. `works_on`. */
  name: Schema.String,
  label: Schema.String,
  synonyms: Schema.optional(Schema.Array(Schema.String)),
  description: Schema.optional(Schema.String),
  domain: Schema.optional(Schema.String),
  range: Schema.optional(Schema.String),
  inverse: Schema.optional(Schema.String),
  equivalents: Schema.optional(Schema.Array(Schema.String)),
  definedBy: Schema.optional(Schema.String),
  created: Schema.optional(Schema.String),
  creator: Schema.optional(Schema.String),
  example: Schema.optional(Schema.String),
  replacedBy: Schema.optional(Schema.String),
});
export interface PredicateEntry extends Schema.Schema.Type<typeof PredicateEntry> {}

//
// Reading facts without a store.
//

/** Prefix of the IRI a fact with no graph of its own is stored under. */
const FACT_IRI_PREFIX = 'https://dxos.org/semantic/fact/';

/** The graph a fact's statement lives in: its own graph, else the graph of the fact alone. */
export const graphOf = (fact: Fact): GraphIri =>
  fact.graph ?? GraphIri.make(FACT_IRI_PREFIX + encodeURIComponent(fact.id));

/** Whether a graph still holds: another graph can replace it (`supersedes`) or withdraw it (`retracts`). */
export const GraphStatus = Schema.Literals(['active', 'superseded', 'retracted']);
export type GraphStatus = Schema.Schema.Type<typeof GraphStatus>;

/** The status of every graph the facts mention, by graph IRI. */
export const graphStatus = (facts: readonly Fact[]): Map<GraphIri, GraphStatus> => {
  const statuses = new Map<GraphIri, GraphStatus>(facts.map((fact) => [graphOf(fact), 'active']));
  for (const fact of facts) {
    for (const superseded of fact.supersedes ?? []) {
      if (statuses.get(superseded) !== 'retracted') {
        statuses.set(superseded, 'superseded');
      }
    }
  }
  for (const fact of facts) {
    for (const retracted of fact.retracts ?? []) {
      statuses.set(retracted, 'retracted');
    }
  }
  return statuses;
};

/**
 * The facts that still hold at `now` (ISO): none in a superseded or retracted graph, none past its `validTo`, and
 * none in a graph with a `kind`, which records a free-text memory rather than a fact.
 */
export const currentFacts = (facts: readonly Fact[], now: string): Fact[] => {
  const statuses = graphStatus(facts);
  const at = Date.parse(now);
  return facts.filter(
    (fact) =>
      fact.kind === undefined && statuses.get(graphOf(fact)) === 'active' && holdsAt(fact.assertion.validTo, at),
  );
};

/** Compared as instants, since extracted `validTo`s vary in offset and precision; one that does not parse is kept. */
const holdsAt = (validTo: string | undefined, now: number): boolean => {
  const until = validTo === undefined ? Number.NaN : Date.parse(validTo);
  return Number.isNaN(until) || until > now;
};

/** The value a term contributes as a join key: the entity key, else the literal. */
export const termValue = (term: Term): string => (term.kind === 'entity' ? term.entity : term.literal);

/** The text of a term, for display. */
export const termText = (term: Term): string => (term.kind === 'entity' ? (term.label ?? term.entity) : term.literal);

/** A fact as one line: subject, predicate, object; a negated fact is marked "not:". */
export const factText = (fact: Fact): string =>
  `${fact.factuality.polarity === '-' ? 'not: ' : ''}${termText(fact.assertion.subject)} ${fact.assertion.predicate} ${termText(fact.assertion.object)}`;
