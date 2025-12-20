//
// Copyright 2024 DXOS.org
//

import { timer as d3Timer } from 'd3';
import { type Timer } from 'd3';
import { createEffect, createSignal, onCleanup } from 'solid-js';

import { type GlobeController } from '../components';

import { type Vector } from './context';

export type SpinnerOptions = {
  disabled?: boolean;
  delta?: Vector;
};

/**
 * Rotates globe.
 */
export const useSpinner = (controller?: GlobeController | null, options: SpinnerOptions = {}) => {
  const [running, setRunning] = createSignal(false);

  createEffect(() => {
    let timer: Timer | undefined;

    const start = () => {
      const delta: Vector = options.delta ?? [0.001, 0, 0];

      let t = 0;
      let lastRotation = controller!.projection.rotate();
      timer = d3Timer((elapsed) => {
        const dt = elapsed - t;
        t = elapsed;

        const rotation: Vector = [
          lastRotation[0] + delta[0] * dt,
          lastRotation[1] + delta[1] * dt,
          lastRotation[2] + delta[2] * dt,
        ];

        lastRotation = rotation;
        controller!.setRotation(rotation);
      });
    };

    const stop = () => {
      if (timer) {
        timer.stop();
        timer = undefined;
      }
    };

    if (controller && running()) {
      start();
    } else {
      stop();
    }

    onCleanup(() => stop());
  });

  return {
    start: () => {
      if (!options.disabled) {
        setRunning(true);
      }
    },
    stop: () => setRunning(false),
  };
};
