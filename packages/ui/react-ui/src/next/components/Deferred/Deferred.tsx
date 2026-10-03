//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import React, { type PropsWithChildren, type ReactNode, useEffect, useRef, useState } from 'react';

/**
 * Long enough that a transient empty state (a scope resolving before its data, a store settling between query
 * identities) is never rendered, short enough that a genuinely empty surface still feels immediate.
 */
const DEFAULT_DELAY = 500;

/** A fallback worth showing at all is worth reading. */
const DEFAULT_MIN_DURATION = 1_000;

export type DeferredProps = PropsWithChildren<{
  /**
   * Whether the fallback is what should be shown, typically "the query has not produced content". Named for what it
   * gates, so a caller's `showEmptyState` passes straight through rather than being inverted at every call site.
   */
  pending: boolean;
  /** How long `pending` must hold before the fallback appears, in ms: the flicker guard. */
  delay?: number;
  /** Once shown, how long the fallback stays, in ms, counted from when it rendered. */
  minDuration?: number;
  /** Rendered while deferred; a thunk, so an expensive fallback costs nothing when it never shows. */
  fallback: () => ReactNode;
}>;

/**
 * Renders `children`, falling back to `fallback` while `pending`, but only once `pending` has held for `delay`, and
 * then for at least `minDuration`. A surface cannot tell "no results yet" from "no results", only how long the state
 * lasts, and a fallback that flashes reads as the real answer. Renders no element of its own.
 */
export const Deferred = ({
  pending,
  delay = DEFAULT_DELAY,
  minDuration = DEFAULT_MIN_DURATION,
  fallback,
  children,
}: DeferredProps) => {
  const [showFallback, setShowFallback] = useState(pending && delay === 0);
  // When the fallback rendered: one still held back by `delay` has not been on screen, so it owes no minimum.
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
