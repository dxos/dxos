//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/ui-theme';

export type LevelMeterProps = {
  /** Input level as linear RMS (0–1). */
  level?: number;
  /** Level (linear RMS) above which input counts as a sounding note. */
  threshold?: number;
  /** Bottom of the scale (dBFS). */
  floor?: number;
  classNames?: string;
};

const toFraction = (value: number, floor: number) =>
  value > 0 ? Math.max(0, Math.min(1, 1 - (20 * Math.log10(value)) / floor)) : 0;

/** Vertical input meter on a dB scale, with the detection threshold marked. */
export const LevelMeter = ({ level = 0, threshold, floor = -60, classNames }: LevelMeterProps) => {
  const height = toFraction(level, floor);
  const mark = threshold !== undefined ? toFraction(threshold, floor) : undefined;
  const above = mark !== undefined && height >= mark;

  return (
    <svg
      viewBox='0 0 12 100'
      preserveAspectRatio='none'
      className={mx('w-3 h-16 shrink-0', classNames)}
      role='meter'
      aria-label='Input level'
      aria-valuemin={floor}
      aria-valuemax={0}
      aria-valuenow={level > 0 ? Math.round(20 * Math.log10(level)) : floor}
      data-above={above || undefined}
    >
      <rect x={0} y={0} width={12} height={100} rx={2} className='fill-group-surface' />
      <rect
        x={0}
        y={100 - height * 100}
        width={12}
        height={height * 100}
        rx={2}
        className={mx('transition-[y,height] duration-75', above ? 'fill-accent-bg' : 'fill-fg-subtle')}
      />
      {mark !== undefined && (
        <line
          x1={0}
          x2={12}
          y1={100 - mark * 100}
          y2={100 - mark * 100}
          strokeWidth={2}
          vectorEffect='non-scaling-stroke'
          className='stroke-fg'
        />
      )}
    </svg>
  );
};
