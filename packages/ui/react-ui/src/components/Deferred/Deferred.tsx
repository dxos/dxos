//
// Copyright 2026 DXOS.org
//

import React, { PropsWithChildren, type ReactNode, useEffect, useRef, useState } from 'react';

/**
 * Long enough that a transient empty state — a scope resolving before its data, a store settling
 * between query identities — is never rendered, short enough that a genuinely empty surface still
 * feels immediate. The policy lives here rather than at each call site so surfaces agree on it.
 */
const DEFAULT_DELAY = 500;

/** A fallback worth showing at all is worth reading. */
const DEFAULT_MIN_DURATION = 1_000;

export type DeferredProps = PropsWithChildren<{
  /**
   * Whether the fallback is what should be shown — typically "the query has not produced content".
   *
   * Named for what it gates rather than for the happy path: a surface asking this question already
   * holds a predicate like `showEmptyState`, and inverting it at every call site is how the two
   * branches get swapped.
   */
  pending: boolean;

  /**
   * How long `pending` must hold before the fallback appears, in ms.
   *
   * This is the flicker guard. A query-driven surface passes through a legitimately-empty state on
   * the way to its first results — a scope that resolves before its data does, a store that settles
   * between identities — and rendering an "empty" panel for those few frames reads as a bug. A
   * pending state shorter than this is never shown at all.
   */
  delay?: number;

  /**
   * Once shown, how long the fallback stays, in ms.
   *
   * The opposite guard to {@link delay}, for the case where content arrives just after the fallback
   * committed: without it the panel would appear and vanish, which is the same flash by another
   * route. Only counted from the moment the fallback actually rendered.
   */
  minDuration?: number;

  /** Rendered while deferred. A thunk, so an expensive fallback costs nothing when it never shows. */
  fallback: () => ReactNode;
}>;

/**
 * Renders `children`, falling back to `fallback` while `pending` — but only once `pending` has held
 * for `delay`, and then for at least `minDuration`.
 *
 * Both bounds exist because a fallback that flashes is worse than one that is slightly late: the
 * user reads a momentary "empty" or "not found" as the real answer. Timing is the honest tool here
 * precisely because the surface cannot distinguish "no results yet" from "no results" — the states
 * are identical, and only their duration differs.
 *
 * @example
 * ```tsx
 * <Deferred pending={showEmptyState} fallback={() => <EmptyPanel />}>
 *   <List items={items} />
 * </Deferred>
 * ```
 */
export const Deferred = ({
  pending,
  delay = DEFAULT_DELAY,
  minDuration = DEFAULT_MIN_DURATION,
  fallback,
  children,
}: DeferredProps) => {
  const [showFallback, setShowFallback] = useState(pending && delay === 0);
  // When the fallback became visible, so `minDuration` measures from the render rather than from the
  // moment `pending` flipped — a fallback held back by `delay` has not been on screen at all yet.
  const shownAt = useRef<number | undefined>(showFallback ? Date.now() : undefined);

  useEffect(() => {
    if (pending) {
      if (showFallback) {
        return;
      }

      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setShowFallback(true);
      }, delay);
      return () => clearTimeout(timer);
    }

    if (!showFallback) {
      return;
    }

    const elapsed = shownAt.current === undefined ? minDuration : Date.now() - shownAt.current;
    const remaining = minDuration - elapsed;
    if (remaining <= 0) {
      shownAt.current = undefined;
      setShowFallback(false);
      return;
    }

    const timer = setTimeout(() => {
      shownAt.current = undefined;
      setShowFallback(false);
    }, remaining);
    return () => clearTimeout(timer);
  }, [pending, showFallback, delay, minDuration]);

  return <>{showFallback ? fallback() : children}</>;
};

Deferred.displayName = 'Deferred';
