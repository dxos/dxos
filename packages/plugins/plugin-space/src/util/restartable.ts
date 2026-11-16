//
// Copyright 2026 DXOS.org
//

export type Restartable = {
  /** Disposes of the last run and runs `setup` again. */
  restart: () => void;
  /** Disposes of the last run. */
  dispose: () => void;
};

/**
 * Runs `setup` afresh on each restart, keeping only the latest run. A restart made while `setup` runs, by a
 * subscription it sets off, supersedes that run, which is disposed of as soon as it returns.
 */
export const makeRestartable = (setup: () => () => void): Restartable => {
  let disposeLast: (() => void) | undefined;
  let generation = 0;
  const dispose = () => {
    generation++;
    const last = disposeLast;
    disposeLast = undefined;
    last?.();
  };
  const restart = () => {
    dispose();
    const current = generation;
    const disposeRun = setup();
    if (current === generation) {
      disposeLast = disposeRun;
    } else {
      disposeRun();
    }
  };
  return { restart, dispose };
};
