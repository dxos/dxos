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
 */
export const TrackHeader = ({ viewport, headers, rows, height, classNames }: TrackHeaderProps) => {
  return (
    <div
      className={mx(
        'absolute left-0 border-r border-neutral-200 dark:border-neutral-700 bg-baseSurface select-none overflow-hidden',
        classNames,
      )}
      style={{ top: headers.top, width: headers.left, height: height - headers.top }}
    >
      <div style={{ transform: `translateY(${-viewport.scrollY}px)` }}>
        {rows.map((row, index) => (
          <div
            key={row.id}
            className={mx(
              'flex items-center px-2 text-xs text-neutral-700 dark:text-neutral-300 border-b border-neutral-100 dark:border-neutral-800',
              index % 2 === 0 ? 'bg-baseSurface' : 'bg-neutral-50 dark:bg-neutral-900',
            )}
            style={{ height: viewport.cellHeight }}
          >
            {row.label ?? row.id}
          </div>
        ))}
      </div>
    </div>
  );
};
