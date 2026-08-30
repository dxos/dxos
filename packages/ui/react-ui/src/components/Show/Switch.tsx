//
// Copyright 2026 DXOS.org
//

import React, { Children, type ReactNode, isValidElement } from 'react';

type RootProps<T> = {
  /** The discriminant each `Match` is tested against. */
  on: T;
  /** Rendered when no `Match` matches. */
  fallback?: ReactNode;
  children: ReactNode;
};

type MatchProps<T> = {
  /** Matched by strict equality with `on`, or by a predicate on it. */
  when: T | ((value: T) => boolean);
  children?: ReactNode;
};

/** A function-typed `when` is a predicate — so `on` values must not themselves be functions. */
const isPredicate = <T,>(when: T | ((value: T) => boolean)): when is (value: T) => boolean =>
  typeof when === 'function';

const SwitchMatch = <T,>({ children }: MatchProps<T>): ReactNode => <>{children}</>;

SwitchMatch.displayName = 'Switch.Match';

/**
 * Structural mode switching after Solid's `<Switch>`/`<Match>` and the ui-template
 * `switch`/`match` grammar: exactly the first matching branch is rendered; the rest never exist.
 *
 * @example
 * ```tsx
 * <Switch.Root on={view} fallback={<ListView />}>
 *   <Switch.Match when='grid'>
 *     <GridView />
 *   </Switch.Match>
 * </Switch.Root>
 * ```
 */
const SwitchRoot = <T,>({ on, fallback = null, children }: RootProps<T>): ReactNode => {
  for (const child of Children.toArray(children)) {
    if (!isValidElement<MatchProps<T>>(child) || child.type !== SwitchMatch) {
      continue;
    }
    const { when } = child.props;
    if (isPredicate(when) ? when(on) : when === on) {
      return child;
    }
  }

  return <>{fallback}</>;
};

SwitchRoot.displayName = 'Switch.Root';

export const Switch = {
  Root: SwitchRoot,
  Match: SwitchMatch,
};

export type { MatchProps as SwitchMatchProps, RootProps as SwitchRootProps };
