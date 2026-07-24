//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';

/**
 * Optional service exposing an {@link AbortSignal} that fires when the current operation run is
 * cancelled. A runtime able to cancel an in-flight run (e.g. the EDGE compute worker, driven by a
 * client cancel request) provides it; operations observe it cooperatively (e.g. via
 * `Pipeline.abortWith`, or by passing `signal` to `fetch`). Absent on runtimes with no external
 * cancel channel — those cancel via fiber interruption instead — so operations must treat it as
 * optional (`Effect.serviceOption`).
 */
export class Cancellation extends Context.Tag('@dxos/compute/Cancellation')<
  Cancellation,
  { readonly signal: AbortSignal }
>() {}
