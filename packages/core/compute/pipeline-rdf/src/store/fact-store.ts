//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import { type SemanticIndexError } from '../errors.ts';
import { type FactAggregate, type FactGroup } from '../internal/sparql/aggregate.ts';
import { type SemanticQuery } from '../internal/sparql/query-builder.ts';
import { type Fact, type Graph, type Ontology } from '../types/index.ts';

//
// The FactStore service tag and API surface only. Implementations live in `fact-store-live.ts`
// (exported as `FactStoreLive`) so operation definitions referencing the tag in `services:`
// stay chunk-free — importing this file must never pull the SPARQL/SQLite machinery.
//

/** One RDF term a SPARQL solution binds; plain data, so rows cross the wire as JSON (xsd:string has no datatype). */
export type SparqlTerm =
  | { readonly termType: 'NamedNode'; readonly value: string }
  | { readonly termType: 'BlankNode'; readonly value: string }
  | { readonly termType: 'Literal'; readonly value: string; readonly datatype?: string; readonly language?: string };

/** One SPARQL solution: each bound variable (named without `?`) to its term; an unbound variable is absent. */
export type SparqlRow = Readonly<Record<string, SparqlTerm>>;

export interface FactStoreApi {
  /** Persist facts as statements in their named graphs (idempotent appends; no write-time merge). */
  readonly putFacts: (facts: readonly Fact[]) => Effect.Effect<void, SemanticIndexError>;
  /**
   * The predicates the store knows, as described in its ontology graph (outside every statement's graph): the seed
   * vocabulary every store starts with, then those its facts minted, with label, definition, defining namespace, and
   * when, by what and from which quote each was minted.
   */
  readonly predicates: () => Effect.Effect<Ontology.Entry[], SemanticIndexError>;
  /** Run a structured query over the stored statements and reassemble the matching Facts. */
  readonly query: (query: SemanticQuery) => Effect.Effect<Fact[], SemanticIndexError>;
  /**
   * Count the statements a query matches, without reassembling them. Exact where {@link query} is capped: the
   * constraints are applied to the statement itself in SQL, so this is the total a capped read is a window on.
   */
  readonly count: (query: SemanticQuery) => Effect.Effect<number, SemanticIndexError>;
  /**
   * Group the matching statements by one or two dimensions and count each group, busiest first. The counting
   * happens in SQLite, so an overview costs the size of its result rather than the size of the corpus.
   */
  readonly aggregate: (aggregate: FactAggregate) => Effect.Effect<FactGroup[], SemanticIndexError>;
  /** Display labels for entity keys, as the graphs mentioning them state them; a key with no label is absent. */
  readonly entityLabels: (keys: readonly string[]) => Effect.Effect<Map<string, string>, SemanticIndexError>;
  /**
   * Which graphs a later fact has replaced or withdrawn, by graph IRI. Read from the store rather than derived
   * from a query's results: the fact that withdrew a claim need not share its subject or predicate, so a scoped
   * read can hold the stale claim and not the link that explains it.
   */
  readonly statuses: () => Effect.Effect<Map<string, Graph.Status>, SemanticIndexError>;
  /** Execute a raw SPARQL `SELECT ?g` and reassemble every statement in the graphs it binds. */
  readonly select: (sparql: string) => Effect.Effect<Fact[], SemanticIndexError>;
  /**
   * Execute a raw SPARQL `SELECT` as written and return its solutions, for queries whose answer is not a set of
   * facts (entities of a class, counts, labels). Anything but a `SELECT` (an update included) fails.
   */
  readonly rows: (sparql: string) => Effect.Effect<SparqlRow[], SemanticIndexError>;
  /** Read the ingest cursor (last processed source hash) keyed by source DXN. */
  readonly cursor: (source: string) => Effect.Effect<string | undefined, SemanticIndexError>;
  /** Upsert the ingest cursor for the given source DXN. */
  readonly setCursor: (source: string, hash: string) => Effect.Effect<void, SemanticIndexError>;
  /** Remove all facts, entities, and cursors from the store; the seed vocabulary is restored. */
  readonly clear: () => Effect.Effect<void, SemanticIndexError>;
}

export class FactStore extends Context.Service<FactStore, FactStoreApi>()('@dxos/pipeline-rdf/FactStore') {}
