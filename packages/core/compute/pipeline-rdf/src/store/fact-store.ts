//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import { type SemanticIndexError } from '../errors.ts';
import { type SemanticQuery } from '../internal/sparql/query-builder.ts';
import { type EntityKind, type Fact, type Ontology } from '../types/index.ts';

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

/** Which statements an entity must take part in to be listed: any, or only those it is the subject of. */
export type EntityRole = 'any' | 'subject';

/** Narrows the entities a window lists, and the facts loaded for them, to what a view shows. */
export type EntityFilter = {
  /** Only entities taking part in a statement in this role; `any` when absent. */
  readonly role?: EntityRole;
  /** Only statements with one of these predicate IRIs (a predicate and its equivalents). */
  readonly predicates?: readonly string[];
};

/** A window of the entities the store's statements name, in a stable order (by label, then key). */
export type EntityWindowQuery = EntityFilter & {
  readonly offset: number;
  readonly limit: number;
  /** Only entities of this kind; every kind when absent. */
  readonly kind?: EntityKind;
  /** Only entities whose label or key contains this text, ignoring case. */
  readonly text?: string;
};

/** One entity as a list row shows it before its facts load. */
export type EntitySummary = {
  /** The entity's key, as a fact's term names it (`Term.entity`). */
  readonly key: string;
  readonly label: string;
  /** The first kind a statement types it with. */
  readonly kind?: EntityKind;
};

/** The entities a window asked for, how many match in all, and how many of those match per kind ignoring `kind`. */
export type EntityWindow = {
  readonly total: number;
  readonly items: readonly EntitySummary[];
  readonly kinds: readonly { readonly kind: EntityKind; readonly count: number }[];
};

/** The facts naming some entities, at most `limit` statement graphs per entity (most recently written first). */
export type EntityFactsQuery = EntityFilter & {
  readonly keys: readonly string[];
  readonly limit?: number;
};

export interface FactStoreApi {
  /**
   * A window of the entities the statements name, filtered and counted in the store, so a list need never load every
   * fact. Absent from stores that cannot answer it (a write-only feed).
   */
  readonly entities?: (query: EntityWindowQuery) => Effect.Effect<EntityWindow, SemanticIndexError>;
  /** The facts naming the given entities (a row's card as it scrolls into view). Absent with `entities`. */
  readonly entityFacts?: (query: EntityFactsQuery) => Effect.Effect<Fact[], SemanticIndexError>;
  /** How many statements use each predicate IRI, counted in the store. Absent with `entities`. */
  readonly predicateUsage?: () => Effect.Effect<Record<string, number>, SemanticIndexError>;
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

/** A store that answers windowed reads: the live SQLite store and its HTTP client do. */
export type WindowedFactStoreApi = FactStoreApi &
  Required<Pick<FactStoreApi, 'entities' | 'entityFacts' | 'predicateUsage'>>;

/** Whether the store answers windowed reads. */
export const isWindowed = (store: FactStoreApi): store is WindowedFactStoreApi =>
  store.entities !== undefined && store.entityFacts !== undefined && store.predicateUsage !== undefined;

export class FactStore extends Context.Service<FactStore, FactStoreApi>()('@dxos/pipeline-rdf/FactStore') {}
