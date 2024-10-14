//
// Copyright 2024 DXOS.org
//

import * as d3 from 'd3';
import { type Timer } from 'd3';
import { useEffect, useState } from 'react';

import { type Vector } from './context';
import { type GlobeController } from '../components';

export type SpinnerOptions = {
  disabled?: boolean;
  delta?: Vector;
};

/**
 * Rotates globe.
 */
export const useSpinner = (controller?: GlobeController | null, options: SpinnerOptions = {}) => {
  const [running, setRunning] = useState(false);
  useEffect(() => {
    let timer: Timer | undefined;

    const start = () => {
      const delta: Vector = options.delta ?? [0.001, 0, 0];

      let t = 0;
      let lastRotation = controller.projection.rotate();
      timer = d3.timer((elapsed) => {
        const dt = elapsed - t;
        t = elapsed;

        const rotation: Vector = [
          lastRotation[0] + delta[0] * dt,
          lastRotation[1] + delta[1] * dt,
          lastRotation[2] + delta[2] * dt,
        ];

        lastRotation = rotation;
        controller.setRotation(rotation);
      });
    };

    const stop = () => {
      if (timer) {
        timer.stop();
        timer = undefined;
      }
    };

    if (controller && running) {
      start();
    } else {
      stop();
    }

    return () => stop();
  }, [controller, running]);

  return [
    () => {
      if (!options.disabled) {
        setRunning(true);
      }
    },
    () => setRunning(false),
  ];
};
