//
// Copyright 2023 DXOS.org
//

import { log } from "@dxos/log";

export interface GenericSignal { notifyRead(): void; notifyWrite(): void };

export interface SignalRuntime {
  createSignal(): GenericSignal;
  batch(cb: () => void): void;
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
  if(runtimeUsed) {
    log.warn("Signal runtime registration is done after the first usage of the runtime. This may cause issues with reactivity.");
  }

  runtimeList.push(runtime);
};

class CompositeSignal implements GenericSignal {
  constructor(
    private readonly _signals: GenericSignal[]
  ) {}

  notifyRead(): void {
    for(const signal of this._signals) {
      signal.notifyRead();
    }
  }
  notifyWrite(): void {
    for(const signal of this._signals) {
      signal.notifyWrite();
    }
  } 

}

class CompositeRuntime implements SignalRuntime {
  batch(cb: () => void): void {
    runtimeUsed = true;

    const callBatchRecursively = (index: number) => {
      if(index >= runtimeList.length) {
        return cb();
      } else {
        runtimeList[index].batch(() => callBatchRecursively(index + 1));
      }

    }
  }
  createSignal(): GenericSignal {
    runtimeUsed = true;

    return new CompositeSignal(runtimeList.map(runtime => runtime.createSignal())); 
  }
}

/**
 * Runtime that represents a composite of all mutliple runtimes.
 * Signal notification would be broadcast to all runtimes individually.
 * Batches are executed in each runtime.
 */
export const compositeRuntime: SignalRuntime = new CompositeRuntime();