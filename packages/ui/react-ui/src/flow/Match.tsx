//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import React, { Children, type ReactNode, isValidElement } from 'react';

type RootProps<T> = {
  /** The discriminant each `Case` is tested against. */
  on: T;
  /** Rendered when no `Case` matches. */
  fallback?: ReactNode;
  children: ReactNode;
};

type CaseProps<T> = {
  /** Matched by strict equality with `on`, or by a predicate on it. */
  when: T | ((value: T) => boolean);
  children?: ReactNode;
};

/** A function-typed `when` is a predicate — so `on` values must not themselves be functions. */
const isPredicate = <T,>(when: T | ((value: T) => boolean)): when is (value: T) => boolean =>
  typeof when === 'function';

const MatchCase = <T,>({ children }: CaseProps<T>): ReactNode => <>{children}</>;

MatchCase.displayName = 'Match.Case';

/**
 * Structural mode switching after Solid's `<Switch>`/`<Match>` and the ui-template
 * `switch`/`match` grammar (named `Match` here: `Switch` is the toggle control): exactly the first matching branch is rendered; the rest never exist.
 *
 * @example
 * ```tsx
 * <Match.Root on={view} fallback={<ListView />}>
 *   <Match.Case when='grid'>
 *     <GridView />
 *   </Match.Case>
 * </Match.Root>
 * ```
 */
const MatchRoot = <T,>({ on, fallback = null, children }: RootProps<T>): ReactNode => {
  for (const child of Children.toArray(children)) {
    if (!isValidElement<CaseProps<T>>(child) || child.type !== MatchCase) {
      continue;
    }
    const { when } = child.props;
    if (isPredicate(when) ? when(on) : when === on) {
      return child;
    }
  }

  return <>{fallback}</>;
};

MatchRoot.displayName = 'Match.Root';
export type { CaseProps as CaseProps, RootProps as RootProps };

export { MatchCase as Case, MatchRoot as Root };
