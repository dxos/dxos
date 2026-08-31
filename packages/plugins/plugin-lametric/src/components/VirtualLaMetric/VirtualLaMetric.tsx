//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { mx } from '@dxos/ui-theme';

import * as LaMetric from '#protocol';
import { HEIGHT, WIDTH, textWidth, toPixels } from '#render';

/** How long each frame holds before the device advances the cycle. */
const FRAME_MS = 3_000;
const SCROLL_MS = 90;

export type VirtualLaMetricProps = {
  /** The frames as pushed, never recomputed here — the replica and the device cannot drift. */
  frames: readonly LaMetric.Frame[];
  /** Pixel size of one LED, so the same component works as a thumbnail and as a review surface. */
  scale?: number;
  className?: string;
};

/**
 * On-screen replica of the device's 37x8 matrix.
 *
 * Rasterised through the same pure function the tests use, so what is reviewed here is what the
 * hardware shows — including whether a line is too wide and has to scroll.
 */
export const VirtualLaMetric = ({ frames, scale = 6, className }: VirtualLaMetricProps) => {
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);

  const frame = frames.length ? frames[index % frames.length] : undefined;
  const scroll = frame && 'text' in frame ? Math.max(0, textWidth(frame.text) - WIDTH) : 0;

  // Advancing the cycle and scrolling are separate clocks on the device, so they are here too.
  useEffect(() => {
    if (frames.length < 2) {
      return;
    }
    const timer = setInterval(() => setIndex((current) => current + 1), FRAME_MS);
    return () => clearInterval(timer);
  }, [frames.length]);

  useEffect(() => {
    setOffset(0);
    if (!scroll) {
      return;
    }
    const timer = setInterval(() => setOffset((current) => (current >= scroll ? 0 : current + 1)), SCROLL_MS);
    return () => clearInterval(timer);
  }, [scroll, index]);

  const pixels = useMemo(() => (frame ? toPixels(frame, offset) : undefined), [frame, offset]);

  return (
    <div
      role='img'
      aria-label={frame && 'text' in frame ? frame.text : 'LaMetric display'}
      className={mx('inline-grid gap-px rounded bg-neutral-900 p-2', className)}
      style={{ gridTemplateColumns: `repeat(${WIDTH}, ${scale}px)`, gridTemplateRows: `repeat(${HEIGHT}, ${scale}px)` }}
    >
      {Array.from({ length: HEIGHT * WIDTH }, (_, cell) => {
        const on = pixels?.[Math.floor(cell / WIDTH)][cell % WIDTH] ?? false;
        return (
          <div
            key={cell}
            className={mx('rounded-[1px]', on ? 'bg-orange-400' : 'bg-neutral-800')}
            style={{ width: scale, height: scale }}
          />
        );
      })}
    </div>
  );
};

VirtualLaMetric.displayName = 'VirtualLaMetric';
