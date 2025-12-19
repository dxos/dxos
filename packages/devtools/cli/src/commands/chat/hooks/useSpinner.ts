//
// Copyright 2025 DXOS.org
//

import { type Accessor, createSignal, onCleanup } from 'solid-js';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

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
