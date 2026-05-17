//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/ui-theme';

import type { Headers, Row, Viewport } from '../state/types';

export type TrackHeaderProps = {
  viewport: Viewport;
  headers: Headers;
  rows: ReadonlyArray<Row>;
  height: number;
  classNames?: string;
};

/**
 * Frozen left column listing row labels. Translates vertically in sync with viewport scroll.
 *
 * Row dividers and alternating shading intentionally MATCH the canvas — opaque borders
 * and opaque alternating fills make the labels look out of phase with the cell area
 * even when the y-positions align. We mirror the canvas's transparent-overlay model
 * here so the frozen column reads as a direct continuation of the grid.
 */
export const TrackHeader = ({ viewport, headers, rows, height, classNames }: TrackHeaderProps) => {
  return (
    <div
      className={mx(
        'absolute left-0 border-r border-neutral-200 dark:border-neutral-700 select-none overflow-hidden',
        classNames,
      )}
      style={{ top: headers.top, width: headers.left, height: Math.max(0, height - headers.top) }}
    >
      <div style={{ transform: `translateY(${-viewport.scrollY}px)` }}>
        {rows.map((row, index) => (
          <div
            key={row.id}
            className='flex items-center px-2 text-xs text-neutral-700 dark:text-neutral-300'
            style={{
              height: viewport.cellHeight,
              // Match the canvas's row-band: a translucent gray overlay on odd rows,
              // transparent on even rows. The container's overall background bleeds
              // through, so the labels stay legible in both themes.
              backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(128, 128, 128, 0.08)',
              // Match the canvas gridline color (rgba(128, 128, 128, 0.25)). Use a
              // half-pixel inset to keep crisp single-pixel rendering on retina.
              boxShadow: 'inset 0 -1px 0 rgba(128, 128, 128, 0.25)',
            }}
          >
            {row.label ?? row.id}
          </div>
        ))}
      </div>
    </div>
  );
};
