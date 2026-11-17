//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useMemo, useRef } from 'react';

import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { ScrollPosition } from '../../types/index.ts';
import { useManagerOptional } from '../ViewStateProvider/view-state-hooks.ts';

export type ScrollScopeProps = PropsWithChildren<{
  /** The EID of the object whose view this is; no scroll is kept without one. */
  contextId?: string;
}>;

/**
 * Keeps the scroll of an object's view as its `ScrollPosition` view state: the outermost `ScrollArea` inside reports
 * where it is, and it is restored when it mounts and when a follow writes the leader's position.
 */
export const ScrollScope = ({ contextId, children }: ScrollScopeProps) => {
  const manager = useManagerOptional();
  const tracking = useRef<ScrollArea.TrackingHandle>(null);

  // Only the areas whose position the follow changed move; the session's own writes are where it already is.
  useEffect(() => {
    if (!manager || !contextId) {
      return;
    }
    let previous = manager.get(ScrollPosition.aspect, contextId);
    return manager.subscribe(ScrollPosition.aspect, contextId, (state, origin) => {
      const changed = Object.entries(state).filter(
        ([name, position]) => JSON.stringify(position) !== JSON.stringify(previous[name]),
      );
      previous = state;
      if (origin === 'follow') {
        changed.forEach(([name, position]) => tracking.current?.restore(name, position));
      }
    });
  }, [manager, contextId]);

  const options = useMemo<ScrollArea.TrackingProps>(
    () =>
      manager && contextId
        ? {
            initial: (name) => manager.get(ScrollPosition.aspect, contextId)[name],
            onScroll: (name, position) =>
              manager.update(ScrollPosition.aspect, contextId, (state) => ({ ...state, [name]: position })),
          }
        : {},
    [manager, contextId],
  );

  return (
    <ScrollArea.Tracking ref={tracking} {...options}>
      {children}
    </ScrollArea.Tracking>
  );
};
