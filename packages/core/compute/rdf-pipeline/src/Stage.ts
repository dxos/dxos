//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

import type { RdfPipelineError } from './errors';
import type { Graph } from './Graph';

/** Pipeline stage transforming one graph into the next. */
export type Stage<E = RdfPipelineError, R = never> = (graph: Graph) => Effect.Effect<Graph, E, R>;

/** Terminal stage extracting typed entities from a graph. */
export type EntityStage<T, E = RdfPipelineError, R = never> = (graph: Graph) => Effect.Effect<readonly T[], E, R>;
