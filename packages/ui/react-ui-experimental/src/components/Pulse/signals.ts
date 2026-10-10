//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useRef } from 'react';

import { type PulseSignal } from './Pulse.tsx';

/** A radial wave about the centre of a `dim × dim` grid. */
export const radialWave =
  (dim: number): PulseSignal =>
  (i, j, time) => {
    const centre = (dim - 1) / 2;
    const distance = Math.hypot(i - centre, j - centre);
    return 0.5 + 0.5 * Math.sin(time * 2 - distance * 0.9);
  };

/** Each column pulses with a phase-shifted sine: bars sweeping across the grid. */
export const ripple: PulseSignal = (i, j, time) => 0.5 + 0.5 * Math.sin(time * 3 + Math.sin((i + j) / 3) * 0.6);

/** A signal scaled down, so dots peak smaller in the same footprint. */
export const scaled =
  (signal: PulseSignal, scale: number): PulseSignal =>
  (i, j, time) =>
    signal(i, j, time) * scale;

/** Randomly pings dots every `interval` milliseconds; each decays back to zero (half-life ≈ 0.46s). */
export const useRandomPing = (dim: number, interval: number): PulseSignal => {
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

  return useCallback<PulseSignal>(
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
