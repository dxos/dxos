//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

/**
 * Terminal commit for a pipeline: applies a stage's output value. Keeps stages pure — they emit
 * typed `Out` descriptions and the sink performs the side effect (in-memory capture in tests, a
 * database write in production).
 */
export type Sink<Out, Ctx, E = never> = (out: Out, ctx: Ctx) => Effect.Effect<void, E>;
