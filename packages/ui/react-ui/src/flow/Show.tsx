//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

export type ShowProps<T> = {
  /** Children render while this is present — anything except `undefined`/`null`/`false` (ui-template's `present`). */
  when: T | undefined | null | false;
  /** Rendered while `when` is absent. */
  fallback?: ReactNode;
  /** A render prop receives the narrowed value and defers evaluation to the taken branch. */
  children: ReactNode | ((value: T) => ReactNode);
};

/**
 * Structural conditional rendering after Solid's `<Show>` and the ui-template `show`/`fallback`
 * grammar: the untaken branch is never rendered, not hidden.
 *
 * @example
 * ```tsx
 * <Show when={task} fallback={<EmptyState />}>
 *   {(task) => <TaskForm task={task} />}
 * </Show>
 * ```
 */
export const Show = <T,>({ when, fallback = null, children }: ShowProps<T>): ReactNode => {
  if (when === undefined || when === null || when === false) {
    return <>{fallback}</>;
  }

  return <>{typeof children === 'function' ? children(when) : children}</>;
};

Show.displayName = 'Show';
