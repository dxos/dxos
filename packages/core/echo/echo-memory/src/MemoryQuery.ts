//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Fact from './Fact.ts';

/** What a {@link Facts} query selects; every field set must hold. */
export const FactQuery = Schema.Struct({
  /** Entity in the subject position. */
  subjectEntity: Schema.optional(Fact.EntityKey),
  /** Entity in the subject or object position. */
  entity: Schema.optional(Fact.EntityKey),
  /** Predicate IRI, or a surface form resolved through the memory's ontology. */
  predicate: Schema.optional(Schema.String),
  /** The item the facts were read from. */
  source: Schema.optional(Fact.SourceUri),
  /** Inclusive lower bound on factuality confidence. */
  minConfidence: Schema.optional(Schema.Number),
});
export interface FactQuery extends Schema.Schema.Type<typeof FactQuery> {}

/** One RDF term a SPARQL solution binds; plain data, so rows cross a wire as JSON. */
export const SparqlTerm = Schema.Union([
  Schema.Struct({ termType: Schema.Literal('NamedNode'), value: Schema.String }),
  Schema.Struct({ termType: Schema.Literal('BlankNode'), value: Schema.String }),
  Schema.Struct({
    termType: Schema.Literal('Literal'),
    value: Schema.String,
    datatype: Schema.optional(Schema.String),
    language: Schema.optional(Schema.String),
  }),
]);
export type SparqlTerm = Schema.Schema.Type<typeof SparqlTerm>;

/** One SPARQL solution: each bound variable (named without `?`) to its term; an unbound variable is absent. */
export const SparqlRow = Schema.Record(Schema.String, SparqlTerm);
export type SparqlRow = Schema.Schema.Type<typeof SparqlRow>;

//
// Query kinds. Each is a tagged struct, so a query is plain JSON; `results` names the schema of each kind's answer.
//

/** Facts whose statement matches a pattern. Answered without SPARQL on every implementation. */
export const Facts = Schema.TaggedStruct('facts', { pattern: FactQuery });
export interface Facts extends Schema.Schema.Type<typeof Facts> {}

/** Every fact in the named graphs a SPARQL `SELECT ?g` binds. */
export const Graphs = Schema.TaggedStruct('graphs', { sparql: Schema.String });
export interface Graphs extends Schema.Schema.Type<typeof Graphs> {}

/** Any SPARQL `SELECT`, its solutions returned as written. */
export const Sparql = Schema.TaggedStruct('sparql', { sparql: Schema.String });
export interface Sparql extends Schema.Schema.Type<typeof Sparql> {}

/** The predicates the memory knows. */
export const Predicates = Schema.TaggedStruct('predicates', {});
export interface Predicates extends Schema.Schema.Type<typeof Predicates> {}

/** How far a source has been read: the `through` of its read cursor. */
export const Cursor = Schema.TaggedStruct('cursor', { source: Fact.SourceUri });
export interface Cursor extends Schema.Schema.Type<typeof Cursor> {}

/** Any query kind. */
export const Any = Schema.Union([Facts, Graphs, Sparql, Predicates, Cursor]);
export type Any = Schema.Schema.Type<typeof Any>;

export type Tag = Any['_tag'];

/** What each kind answers. */
export interface Results {
  readonly facts: readonly Fact.Fact[];
  readonly graphs: readonly Fact.Fact[];
  readonly sparql: readonly SparqlRow[];
  readonly predicates: readonly Fact.PredicateEntry[];
  readonly cursor: string | undefined;
}

/** The schema of each kind's answer, so a remote client decodes an answer by the query's `_tag`. */
export const results: { readonly [K in Tag]: Schema.Codec<Results[K], unknown> } = {
  facts: Schema.Array(Fact.Fact),
  graphs: Schema.Array(Fact.Fact),
  sparql: Schema.Array(SparqlRow),
  predicates: Schema.Array(Fact.PredicateEntry),
  cursor: Schema.UndefinedOr(Schema.String),
};

/** The schema of a kind's answer. */
export const resultSchema = <K extends Tag>(tag: K): Schema.Codec<Results[K], unknown> => results[tag];

/** The schema of a query's answer. */
export const resultOf = <Q extends Any>(query: Q): Schema.Codec<Results[Q['_tag']], unknown> =>
  resultSchema<Q['_tag']>(query._tag);

/** What a query answers. */
export type ResultOf<Q extends Any> = Results[Q['_tag']];

/** Facts whose statement matches the pattern; answers `Fact[]`. */
export const facts = (pattern: FactQuery = {}): Facts => Facts.make({ pattern });

/** Every fact in the graphs a `SELECT ?g` binds; answers `Fact[]`. */
export const graphs = (sparql: string): Graphs => Graphs.make({ sparql });

/** A SPARQL `SELECT`'s solutions; answers `SparqlRow[]`. */
export const sparql = (sparql: string): Sparql => Sparql.make({ sparql });

/** The known predicates; answers `PredicateEntry[]`. */
export const predicates = (): Predicates => Predicates.make({});

/** A source's read cursor; answers `string | undefined`. */
export const cursor = (source: Fact.SourceUri): Cursor => Cursor.make({ source });
