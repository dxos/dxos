//
// Copyright 2026 DXOS.org
//

import type { Quad, Quad_Graph, Quad_Object, Quad_Predicate, Quad_Subject } from '@rdfjs/types';
import type * as Effect from 'effect/Effect';
import type { Lens, Schema } from 'ldkit';

import type * as Ontology from '../Ontology.ts';

/**
 * The quad-store half of `Store`, behind which the two backends differ. The ledger and its commit
 * protocol sit above this and are shared, so both backends make the same crash-safety guarantees.
 */

export type Binding = Record<string, string>;

export type ReasonerInput = {
  readonly name: string;
  readonly rules: string;
};

export type ReasonOutcome = {
  readonly name: string;
  readonly derived: number;
  readonly durationMs: number;
  /** Maintained from the changes since the last pass rather than recomputed (native backend only). */
  readonly incremental: boolean;
};

export interface Graph<E> {
  /** Replaces the contents of `clear` with the document's quads, homed in `graph`, atomically. */
  readonly swap: (
    clear: readonly string[],
    graph: Quad_Graph,
    document: Ontology.FileDocument,
  ) => Effect.Effect<void, E>;
  readonly drop: (graph: string) => Effect.Effect<void, E>;
  readonly putQuads: (quads: readonly Quad[]) => Effect.Effect<void, E>;
  readonly delQuads: (quads: readonly Quad[]) => Effect.Effect<void, E>;
  readonly match: (
    subject?: Quad_Subject,
    predicate?: Quad_Predicate,
    object?: Quad_Object,
    graph?: Quad_Graph,
  ) => Effect.Effect<Quad[], E>;
  readonly select: (sparql: string) => Effect.Effect<Binding[], E>;
  readonly ask: (sparql: string) => Effect.Effect<boolean, E>;
  readonly construct: (sparql: string) => Effect.Effect<Quad[], E>;
  readonly lens: <T extends Schema>(schema: T) => Lens<T>;
  /** One rule file, premises = the file graphs and every other derived graph; see `Store.reason`. */
  readonly reason: (graph: Quad_Graph, rules: string, materialize: boolean) => Effect.Effect<Quad[], E>;
  /** Every rule file in order, each replacing (or maintaining) its own derived graph. */
  readonly reasonAll: (reasoners: readonly ReasonerInput[]) => Effect.Effect<ReasonOutcome[], E>;
  readonly count: () => Effect.Effect<number, E>;
  readonly clear: () => Effect.Effect<void, E>;
}
