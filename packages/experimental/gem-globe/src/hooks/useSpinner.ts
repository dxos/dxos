//
// Copyright 2024 DXOS.org
//

import * as d3 from 'd3';
import { useRef } from 'react';

import { type Vector } from '../components';

export const useSpinner = (callback: (rotation: Vector) => void) => {
  const timer = useRef<any>(null);

  let lastRotation = [0, 0, 0];

  const start = (initial?: Vector, delta: Vector = [0.001, 0, 0]) => {
    stop();

    let t = 0;
    if (initial) {
      lastRotation = initial;
    }

    timer.current = d3.timer((elapsed) => {
      const dt = elapsed - t;
      t = elapsed;

      const rotation: Vector = [
        lastRotation[0] + delta[0] * dt,
        lastRotation[1] + delta[1] * dt,
        lastRotation[2] + delta[2] * dt,
      ];

      lastRotation = rotation;
      callback(rotation);
    });
  };

  const stop = () => {
    if (timer.current) {
      timer.current.stop();
      timer.current = undefined;
    }
  };

  return [start, stop];
};
