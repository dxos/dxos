//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

/**
 * Cooperative cancellation of the current operation run. The runtime that owns execution provides
 * the service and fires the signal when the run is cancelled — the EDGE worker on a client cancel
 * request, the local process runtime on terminate. Operations observe it via {@link signal}.
 */
// Tags unify by key string: a version-skewed bundle carrying two `@dxos/compute` instances (e.g. an
// EDGE worker whose provider and handlers resolve different copies) must still share this service,
// so the key must never change.
export class Service extends Context.Tag('@dxos/compute/Cancellation')<Service, { readonly signal: AbortSignal }>() {}

/**
 * The current run's cancellation signal — e.g. for `Pipeline.abortWith` or `fetch`. Never fires when
 * the runtime provided no cancellation channel.
 */
// A fresh signal per access: a shared never-firing singleton would accumulate listeners across runs.
export const signal: Effect.Effect<AbortSignal> = Effect.serviceOption(Service).pipe(
  Effect.map(
    Option.match({
      onNone: () => new AbortController().signal,
      onSome: (service) => service.signal,
    }),
  ),
);
