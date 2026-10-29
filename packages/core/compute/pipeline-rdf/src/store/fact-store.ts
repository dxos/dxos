//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import { type SemanticIndexError } from '../errors.ts';
import { type SemanticQuery } from '../internal/sparql/query-builder.ts';
import { type Fact, type Ontology } from '../types/index.ts';

//
// The FactStore service tag and API surface only. Implementations live in `fact-store-live.ts`
// (exported as `FactStoreLive`) so operation definitions referencing the tag in `services:`
// stay chunk-free - importing this file must never pull the SPARQL/SQLite machinery.
//

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
  /** Execute a raw SPARQL `SELECT ?g` and reassemble every statement in the graphs it binds. */
  readonly select: (sparql: string) => Effect.Effect<Fact[], SemanticIndexError>;
  /** Read the ingest cursor (last processed source hash) keyed by source DXN. */
  readonly cursor: (source: string) => Effect.Effect<string | undefined, SemanticIndexError>;
  /** Upsert the ingest cursor for the given source DXN. */
  readonly setCursor: (source: string, hash: string) => Effect.Effect<void, SemanticIndexError>;
  /** Remove all facts, entities, and cursors from the store; the seed vocabulary is restored. */
  readonly clear: () => Effect.Effect<void, SemanticIndexError>;
}

export class FactStore extends Context.Service<FactStore, FactStoreApi>()('@dxos/pipeline-rdf/FactStore') {}
