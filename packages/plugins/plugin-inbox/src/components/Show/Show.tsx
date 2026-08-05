//
// Copyright 2026 DXOS.org
//

import { type Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { type ReactNode } from 'react';

export type ShowProps<T> = {
  /** Condition source; the branch re-renders on atom change without re-rendering the parent. */
  when: Atom.Atom<T>;
  /** Rendered when `when` is truthy; the function form receives the current value. */
  children: ReactNode | ((value: T) => ReactNode);
  /** Rendered when `when` is falsy. */
  fallback?: ReactNode;
};

/**
 * Solid-style conditional rendering driven by an atom (experiment: declarative control flow in
 * place of conditional braces — see the declarative-ui-abstraction spec). Because the atom is
 * read here rather than in the parent, the condition's subscription is scoped to the branch.
 *
 * Not slot-transparent: don't place directly under an `asChild` parent — put the slotted element
 * inside each branch instead.
 */
export const Show = <T,>({ when, children, fallback }: ShowProps<T>): ReactNode => {
  const value = useAtomValue(when);
  if (!value) {
    return fallback ?? null;
  }
  return typeof children === 'function' ? children(value) : children;
};
