//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { useEffect, useRef, useState } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';

/** Picks the declared dependency fields from the form values — the subset a dynamic field subscribes to. */
export const pickValues = (values: AnyProperties | undefined, deps: readonly string[]): Record<string, unknown> => {
  const subset: Record<string, unknown> = {};
  for (const dep of deps) {
    subset[dep] = values?.[dep];
  }
  return subset;
};

export type AsyncFieldEffectState<A> = {
  loading: boolean;
  error: unknown;
  data: A | undefined;
};

export type UseAsyncFieldEffectOptions = {
  /** Debounce applied before running, so per-keystroke value changes coalesce into one run. */
  debounceMs?: number;
  /** When false, the effect is not run and prior data/error is cleared. */
  enabled?: boolean;
};

/**
 * Runs a self-contained Effect (`R = never`) whenever `key` changes, debounced and abortable. Used by
 * dynamic form fields to load select options, derive values, or validate against an external source from
 * the current form values. The latest `factory` is always used, but a run is only (re)triggered when
 * `key` changes — derive `key` from the inputs the factory actually reads. Re-running interrupts the
 * prior run (cancelling any in-flight request).
 */
export const useAsyncFieldEffect = <A>(
  factory: () => Effect.Effect<A, unknown>,
  key: string,
  { debounceMs = 400, enabled = true }: UseAsyncFieldEffectOptions = {},
): AsyncFieldEffectState<A> => {
  const factoryRef = useRef(factory);
  factoryRef.current = factory;
  const [state, setState] = useState<AsyncFieldEffectState<A>>({ loading: false, error: undefined, data: undefined });

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false, error: undefined, data: undefined });
      return;
    }

    let cancel: (() => void) | undefined;
    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, loading: true, error: undefined }));
      cancel = Effect.runCallback(factoryRef.current(), {
        onExit: (exit: Exit.Exit<A, unknown>) => {
          Exit.match(exit, {
            onSuccess: (data) => setState({ loading: false, error: undefined, data }),
            onFailure: (cause) => {
              // A superseding run interrupts this one; ignore the resulting interruption.
              if (!Cause.isInterruptedOnly(cause)) {
                setState((prev) => ({ loading: false, error: Cause.squash(cause), data: prev.data }));
              }
            },
          });
        },
      });
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      cancel?.();
    };
  }, [key, enabled, debounceMs]);

  return state;
};
