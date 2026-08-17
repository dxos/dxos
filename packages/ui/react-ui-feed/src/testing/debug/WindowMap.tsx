//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type WindowState } from '../../components';

/**
 * The whole list at a glance: what exists, what is mounted, and what the reader can see.
 *
 * Drawn in **content space**, not in indices. The three quantities a virtualized list can get wrong
 * are where the mounted rows are, how big the reader's slice of them is, and whether the total the
 * thumb is scaled against is honest — and none of those are visible from a row count. Here they are
 * three bars on one track, so a mounted range that has drifted away from the viewport, or a total
 * that jumps while nothing scrolls, is a picture rather than a number to be noticed.
 *
 * Debug only. It reads the state the window publishes and draws it (§2); it does not participate.
 */
export type WindowMapProps = ThemedClassName<{
  state?: WindowState;
}>;

export const WindowMap = ({ classNames, state }: WindowMapProps) => {
  const total = state?.geometry.total ?? 0;
  const scale = (value: number) => (total > 0 ? `${Math.max(0, Math.min(100, (value / total) * 100))}%` : '0%');

  return (
    <div
      className={mx('relative w-3 h-full rounded-sm bg-input-surface overflow-hidden', classNames)}
      title={total ? `${Math.round(total)}px over ${state?.count} rows` : 'empty'}
      data-testid='window.map'
    >
      {state && total > 0 && (
        <>
          {/* Mounted rows: where content actually exists. Should always contain the viewport — if it
              does not, the reader is looking at rows nobody has rendered. */}
          <div
            className='absolute inset-x-0 bg-accent-fill/30'
            style={{ top: scale(state.geometry.window.start), height: scale(state.geometry.window.extent) }}
            data-testid='window.map.mounted'
          />
          {/* The viewport, which is the reader. */}
          <div
            className='absolute inset-x-0 border-y border-accent-bg bg-accent-fill/70'
            style={{ top: scale(state.geometry.scroll), height: scale(state.geometry.viewport) }}
            data-testid='window.map.viewport'
          />
        </>
      )}
    </div>
  );
};
