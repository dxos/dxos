//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type { Graph } from './Graph';
import type { EntityStage, Stage } from './Stage';

/** Run graph stages left-to-right, threading the successor graph from each step. */
export const run = (
  graph: Graph,
  stages: ReadonlyArray<Stage<any, any>>,
): Effect.Effect<Graph, unknown> =>
  Effect.reduce(stages, graph, (current, stage) => stage(current) as Effect.Effect<Graph, unknown, never>);

/** Run graph stages then a terminal entity extraction stage. */
export const runExtract = <T, E, R>(
  graph: Graph,
  stages: ReadonlyArray<Stage<any, any>>,
  extract: EntityStage<T, E, R>,
): Effect.Effect<readonly T[], unknown | E, R> =>
  run(graph, stages).pipe(Effect.flatMap((result) => extract(result)));
