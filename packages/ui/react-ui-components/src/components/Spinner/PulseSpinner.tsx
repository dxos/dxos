//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type Size } from '@dxos/ui-types';

import { DotMatrix, type DotSignal } from './DotMatrix.tsx';
import { type ActivityState, type SpinnerProps } from './Spinner.tsx';

//
// Signals
//

/** A radial wave about the centre of a `dim × dim` grid. */
export const radialWave =
  (dim: number): DotSignal =>
  (i, j, time) => {
    const centre = (dim - 1) / 2;
    const distance = Math.hypot(i - centre, j - centre);
    return 0.5 + 0.5 * Math.sin(time * 2 - distance * 0.9);
  };

/** Each column pulses with a phase-shifted sine: bars sweeping across the grid. */
export const ripple: DotSignal = (i, j, time) => 0.5 + 0.5 * Math.sin(time * 3 + Math.sin((i + j) / 3) * 0.6);

/** A signal scaled down, so dots peak smaller in the same footprint. */
export const scaled =
  (signal: DotSignal, scale: number): DotSignal =>
  (i, j, time) =>
    signal(i, j, time) * scale;

/** Randomly pings dots every `interval` milliseconds; each decays back to zero (half-life ≈ 0.46s). */
export const useRandomPing = (dim: number, interval: number): DotSignal => {
  const valuesRef = useRef<Float32Array>(new Float32Array(dim * dim));
  const lastTimeRef = useRef(0);

  useEffect(() => {
    valuesRef.current = new Float32Array(dim * dim);
    lastTimeRef.current = 0;
  }, [dim]);

  useEffect(() => {
    const id = setInterval(() => {
      valuesRef.current[Math.floor(Math.random() * valuesRef.current.length)] = 1;
    }, interval);

    return () => clearInterval(id);
  }, [interval]);

  return useCallback<DotSignal>(
    (i, j, time) => {
      if (time !== lastTimeRef.current) {
        const dt = lastTimeRef.current === 0 ? 0 : time - lastTimeRef.current;
        const decay = Math.exp(-dt * 1.5);
        const values = valuesRef.current;
        for (let k = 0; k < values.length; k++) {
          values[k] *= decay;
        }
        lastTimeRef.current = time;
      }
      return valuesRef.current[i * dim + j];
    },
    [dim],
  );
};

//
// Spinner
//

/** Four dots a side, touching: an icon-sized matrix. */
const DIM = 4;

/** The theme's size scale in CSS pixels (a step is a quarter rem). */
const pixels = (size: Size): number => (size === 'px' ? 1 : size * 4);

// Smaller peaks than thinking's pings, in the same footprint: the signal is scaled rather than the radius, so every
// state keeps the spinner's size and dot positions.
const SIGNALS: Record<Exclude<ActivityState, 'thinking'>, DotSignal> = {
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
      <DotMatrix
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
