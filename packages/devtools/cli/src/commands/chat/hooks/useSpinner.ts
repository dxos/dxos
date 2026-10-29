//
// Copyright 2025 DXOS.org
//

import { type Accessor, createSignal, onCleanup } from 'solid-js';

const SPINNER_FRAMES = [
  '\u280B',
  '\u2819',
  '\u2839',
  '\u2838',
  '\u283C',
  '\u2834',
  '\u2826',
  '\u2827',
  '\u2807',
  '\u280F',
];

export type SpinnerControls = {
  frame: Accessor<string>;
  start: () => void;
  stop: () => void;
};

/**
 * Custom hook for managing spinner animation.
 */
export const useSpinner = (): SpinnerControls => {
  const [spinnerFrame, setSpinnerFrame] = createSignal(0);
  let spinnerInterval: NodeJS.Timeout | null = null;

  const start = () => {
    if (spinnerInterval) {
      return; // Already running
    }
    spinnerInterval = setInterval(() => {
      setSpinnerFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);
  };

  const stop = () => {
    if (spinnerInterval) {
      clearInterval(spinnerInterval);
      spinnerInterval = null;
    }
  };

  // Cleanup on component unmount.
  onCleanup(() => {
    stop();
  });

  return {
    frame: () => SPINNER_FRAMES[spinnerFrame()],
    start,
    stop,
  };
};
