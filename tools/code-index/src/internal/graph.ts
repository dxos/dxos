//
// Copyright 2026 DXOS.org
//

import type { Quad, Quad_Graph, Quad_Object, Quad_Predicate, Quad_Subject } from '@rdfjs/types';
import type * as Effect from 'effect/Effect';
import type { Lens, Schema } from 'ldkit';

/**
 * The quad-store half of `Store`, implemented by `native.ts`. The ledger and its commit protocol sit
 * above this, so the quad store only has to make one batch of graph swaps atomic.
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
  /** Maintained from the changes since the last pass rather than recomputed. */
  readonly incremental: boolean;
};

/** One file's graph swap: `clear` is emptied and `triples` (N-Triples) land in `graph`. */
export type DocumentWrite = {
  readonly clear: readonly string[];
  readonly graph: string;
  readonly triples: string;
};

export interface Graph<E> {
  /** Every write of a batch in one transaction: nothing observes a half-written graph. */
  readonly swap: (writes: readonly DocumentWrite[]) => Effect.Effect<void, E>;
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
  /** Quads in one named graph, without materialising them. */
  readonly countGraph: (graph: string) => Effect.Effect<number, E>;
  readonly clear: () => Effect.Effect<void, E>;
}
