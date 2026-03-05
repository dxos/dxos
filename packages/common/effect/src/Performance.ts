//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Exit from 'effect/Exit';

export interface AddTrackEntryOptions {
  name: string;
  devtools?: {
    /**
     * @example 'track-entry'
     */
    dataType: string;
    track: string;
    trackGroup: string;
    /**
     * @example 'tertiary-dark'
     */
    color: string;
    properties?: [string, any][];
    tooltipText?: string;
  };
  detail?: Record<string, unknown>;
}

/**
 * Puts the effect span on the performance timeline in DevTools.
 */
export const addTrackEntry =
  <A, E>(options: AddTrackEntryOptions | ((exit: Exit.Exit<A, E>) => AddTrackEntryOptions)) =>
  <R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.gen(function* () {
      const start = performance.now();
      const exit = yield* Effect.exit(effect);
      const resolvedOptions = typeof options === 'function' ? options(exit) : options;
      performance.measure(resolvedOptions.name, {
        start: start,
        detail: {
          ...resolvedOptions.detail,
          devtools: resolvedOptions.devtools,
        },
      });
      return yield* exit;
    });
