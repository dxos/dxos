//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

// Driven by animation frames and their timestamps, never CSS transitions, so a page on a fake clock (a frame-by-frame
// render) steps every fade in time with the simulation.

/** Runs linearly from where it is to `target` over `duration` ms whenever `target` changes, rendering each step. */
export const useTween = (target: number, duration: number): number => {
  const [value, setValue] = useState(target);
  useEffect(() => {
    const from = value;
    if (from === target) {
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / duration);
      setValue(from + (target - from) * t);
      if (t < 1) {
        frame = requestAnimationFrame(step);
      }
    });
    return () => cancelAnimationFrame(frame);
    // Restarted only by a new target, from wherever the last run left off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return value;
};

/** Runs linearly from 0 to 1 over `duration` ms each time `key` changes (each phase of it eases itself); 1 while none. */
export const useRun = (key: number | undefined, duration: number): number => {
  const [value, setValue] = useState(1);
  useEffect(() => {
    if (key === undefined) {
      return;
    }
    const start = performance.now();
    setValue(0);
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / duration);
      setValue(t);
      if (t < 1) {
        frame = requestAnimationFrame(step);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [key, duration]);
  return value;
};
