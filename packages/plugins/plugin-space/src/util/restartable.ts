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
 * Runs `setup` afresh on each restart, keeping only the latest run. A restart made while the last run is disposed of,
 * or while `setup` runs, supersedes this one: the newer restart's run is the one kept.
 */
export const makeRestartable = (setup: () => () => void): Restartable => {
  let disposeLast: (() => void) | undefined;
  let generation = 0;
  const disposeCurrent = () => {
    const last = disposeLast;
    disposeLast = undefined;
    last?.();
  };
  const dispose = () => {
    generation++;
    disposeCurrent();
  };
  const restart = () => {
    const current = ++generation;
    disposeCurrent();
    if (current !== generation) {
      return;
    }
    const disposeRun = setup();
    if (current === generation) {
      disposeLast = disposeRun;
    } else {
      disposeRun();
    }
  };
  return { restart, dispose };
};
