//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { mx } from '@dxos/ui-theme';

import type { Headers, Viewport } from '../state/types';
import { cellWidth } from '../state/viewport';

export type RulerProps = {
  viewport: Viewport;
  headers: Headers;
  width: number;
  /** Number of columns to label between major ticks. */
  majorEvery?: number;
  classNames?: string;
};

/**
 * Frozen top ruler. Ticks reflect the current viewport scroll and zoom.
 */
export const Ruler = ({ viewport, headers, width, majorEvery = 4, classNames }: RulerProps) => {
  // Clamp to >= 1 — a zero or negative `majorEvery` makes `col % majorEvery`
  // NaN / always-zero and breaks major-tick detection.
  const safeMajorEvery = Math.max(1, Math.floor(majorEvery));
  const ticks = useMemo(() => {
    const w = cellWidth(viewport);
    if (w < 1 || width <= headers.left) {
      return [];
    }
    const innerWidth = width - headers.left;
    const startCol = Math.floor(viewport.scrollX / w);
    const endCol = Math.ceil((viewport.scrollX + innerWidth) / w);
    const result: Array<{ col: number; x: number; major: boolean }> = [];
    for (let col = startCol; col <= endCol; col++) {
      result.push({
        col,
        x: headers.left + col * w - viewport.scrollX,
        major: col % safeMajorEvery === 0,
      });
    }
    return result;
  }, [viewport, headers.left, width, safeMajorEvery]);

  return (
    <div
      className={mx(
        'absolute top-0 left-0 right-0 border-b border-neutral-200 dark:border-neutral-700 bg-baseSurface select-none overflow-hidden',
        classNames,
      )}
      style={{ height: headers.top }}
    >
      {ticks.map(({ col, x, major }) => (
        <div
          key={col}
          className={mx(
            'absolute top-0 bottom-0 text-[10px] text-neutral-500 dark:text-neutral-400',
            major
              ? 'border-l border-neutral-400 dark:border-neutral-500'
              : 'border-l border-neutral-200 dark:border-neutral-700',
          )}
          style={{ transform: `translateX(${x}px)` }}
        >
          {major ? <span className='absolute left-1 top-0'>{col}</span> : null}
        </div>
      ))}
    </div>
  );
};
