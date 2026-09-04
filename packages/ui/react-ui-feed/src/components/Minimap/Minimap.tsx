//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { type WindowState } from '@dxos/react-ui-virtual';
import { mx } from '@dxos/ui-theme';

/** 2rem, matching the outline rail it usually sits opposite. */
const DEFAULT_WIDTH = 32;

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
export type MinimapProps = ThemedClassName<{
  state?: WindowState;
  /** Width of the rail, in px. @default 32 (2rem) */
  width?: number;
  /**
   * Jump to where the reader pointed, as a fraction of the whole list.
   *
   * A fraction and not an index: the map is drawn in content space, so what a click names is a
   * position, and turning that into a row is the host's business — it has the count.
   */
  onSelect?: (fraction: number) => void;
}>;

export const Minimap = ({ classNames, state, width = DEFAULT_WIDTH, onSelect }: MinimapProps) => {
  const total = state?.geometry.total ?? 0;
  const scale = (value: number) => (total > 0 ? `${Math.max(0, Math.min(100, (value / total) * 100))}%` : '0%');

  return (
    <div
      className={mx('relative h-full bg-input-surface overflow-hidden', onSelect && 'cursor-pointer', classNames)}
      style={{ width }}
      title={total ? `${Math.round(total)}px over ${state?.count} rows` : 'empty'}
      data-testid='minimap'
      onClick={
        onSelect &&
        ((event) => {
          const box = event.currentTarget.getBoundingClientRect();
          onSelect(Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)));
        })
      }
    >
      {state && total > 0 && (
        <>
          {/* Mounted rows: where content actually exists. Should always contain the viewport — if it
              does not, the reader is looking at rows nobody has rendered. */}
          <div
            className='absolute inset-x-0 bg-accent-fill/30'
            style={{ top: scale(state.geometry.window.start), height: scale(state.geometry.window.extent) }}
            data-testid='minimap.mounted'
          />
          {/* Tenths, so a glance says roughly where in the list a bar sits without reading a number. */}
          {Array.from({ length: 9 }, (_, step) => (
            <div
              key={step}
              className='absolute inset-x-0 border-t border-separator/40'
              style={{ top: `${((step + 1) / 10) * 100}%` }}
            />
          ))}
          {/* The viewport, which is the reader. */}
          <div
            className='absolute inset-x-0 border-y border-accent-bg bg-accent-fill/70'
            style={{ top: scale(state.geometry.scroll), height: scale(state.geometry.viewport) }}
            data-testid='minimap.viewport'
          />
        </>
      )}
    </div>
  );
};
