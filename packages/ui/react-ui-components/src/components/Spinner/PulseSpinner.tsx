//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/ui-theme';
import { type Size } from '@dxos/ui-types';

import { Pulse, type PulseSignal, radialWave, ripple, scaled, useRandomPing } from '../Pulse/index.ts';
import { type ActivityState, type SpinnerProps } from './Spinner.tsx';

/** Four dots a side, touching: an icon-sized matrix. */
const DIM = 4;

/** The theme's size scale in CSS pixels (a step is a quarter rem). */
const pixels = (size: Size): number => (size === 'px' ? 1 : size * 4);

// Smaller peaks than thinking's pings, in the same footprint: the signal is scaled rather than the radius, so every
// state keeps the spinner's size and dot positions.
const SIGNALS: Record<Exclude<ActivityState, 'thinking'>, PulseSignal> = {
  ready: scaled(radialWave(DIM), 0.6),
  // The ready wave: the calm motion stays, the colour carries the warning.
  alert: scaled(radialWave(DIM), 0.6),
  error: scaled(ripple, 0.6),
};

const COLORS: Record<ActivityState, string> = {
  ready: 'text-primary-500',
  thinking: 'text-primary-500',
  alert: 'text-amber-500',
  error: 'text-rose-500',
};

/** A dot matrix: a wave when ready (amber on alert), random pings while thinking, a sweep on error. */
export const PulseSpinner = ({ classNames, state = 'ready', size = 5, onClick }: SpinnerProps) => {
  const thinking = useRandomPing(DIM, 100);
  const maxRadius = pixels(size) / DIM / 2;
  return (
    // The click target, as the shape spinner's own element is; a layout primitive takes no handlers.
    <div role='none' className={mx('flex shrink-0 cursor-pointer', classNames)} onClick={onClick}>
      <Pulse
        dim={DIM}
        maxRadius={maxRadius}
        minRadius={maxRadius / 6}
        gap={0}
        smoothing={0.3}
        classNames={COLORS[state]}
        getSignal={state === 'thinking' ? thinking : SIGNALS[state]}
      />
    </div>
  );
};

PulseSpinner.displayName = 'PulseSpinner';
