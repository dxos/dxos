//
// Copyright 2023 DXOS.org
//

export interface GenericSignal {
  /**
   * Simulate a read operation on the signal.
   * Subscribes the current computation to the signal.
   */
  notifyRead(): void;

  /**
   * Simulate a write operation on the signal.
   * Notifies all subscribed computations about the change.
   */
  notifyWrite(): void;
}

export interface SignalRuntime {
  /**
   * @param debugInfo - Optional string name or owner object of the signal. Used for debugging purposes.
   */
  createSignal(debugInfo?: unknown): GenericSignal;

  /**
   * All writes inside the callback will be batched and notified when the callback is finished.
   */
  batch(cb: () => void): void;

  /**
   * @deprecated Temporary measure to prevent ECHO from subscribing to signals within its internals.
   */
  untracked<T>(cb: () => T): T;
}

export const runtimeList: SignalRuntime[] = [];

/**
 * Self check to ensure registration is done before the first usage.
 */
let runtimeUsed = false;

/**
 * Registeres a signal runtime (e.g., Preact Signals or SolidJS).
 * ECHO will hook into the runtime so that ECHO objects generate signal-like notifications on changes.
 * Registration is done at the module level (e.g., in the main module of the runtime).
 * Multiple runtimes can be registered at once.
 */
export const registerSignalRuntime = (runtime: SignalRuntime) => {
  if (runtimeUsed) {
    // TODO(dmaretskyi): This is always taken because echo schema stuff creates typed objects when echo-schema package is imported.
    // log.warn(
    //   'Signal runtime registration is done after the first usage of the runtime. This may cause issues with reactivity.',
    // );
  }

  runtimeList.push(runtime);
};

class CompositeSignal implements GenericSignal {
  constructor(
    private readonly _signals: GenericSignal[],

    public readonly debugInfo: unknown = undefined,
  ) {}

  notifyRead(): void {
    for (const signal of this._signals) {
      signal.notifyRead();
    }
  }

  notifyWrite(): void {
    for (const signal of this._signals) {
      signal.notifyWrite();
    }
  }
}

class CompositeRuntime implements SignalRuntime {
  batch(cb: () => void): void {
    runtimeUsed = true;

    const callBatchRecursively = (index: number): void => {
      if (index >= runtimeList.length) {
        return cb();
      } else {
        return runtimeList[index].batch(() => callBatchRecursively(index + 1));
      }
    };

    return callBatchRecursively(0);
  }

  createSignal(debugInfo?: unknown): GenericSignal {
    runtimeUsed = true;

    return new CompositeSignal(
      runtimeList.map((runtime) => runtime.createSignal(debugInfo)),
      debugInfo,
    );
  }

  untracked<T>(cb: () => T): T {
    runtimeUsed = true;

    const callUntrackedRecursively = (index: number): T => {
      if (index >= runtimeList.length) {
        return cb();
      } else {
        return runtimeList[index].untracked(() => callUntrackedRecursively(index + 1));
      }
    };

    return callUntrackedRecursively(0);
  }
}

/**
 * Runtime that represents a composite of all mutliple runtimes.
 * Signal notification would be broadcast to all runtimes individually.
 * Batches are executed in each runtime.
 */
export const compositeRuntime: SignalRuntime = new CompositeRuntime();
