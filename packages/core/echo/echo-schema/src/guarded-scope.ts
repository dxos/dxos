//
// Copyright 2024 DXOS.org
//

import { registerSignalRuntime, type GenericSignal } from '@dxos/echo-signals/runtime';

//
// This module is used to guard against ECHO subscribing to signals within it's internals.
//

let areSignalsProhibited = false;

let inUntrackedScope = false;

class GuardSignal implements GenericSignal {
  constructor(public readonly debugInfo: unknown) {}

  notifyRead() {
    // Separate if statements so it's possible to place a debugger breakpoint on `!inUntrackedScope` condition.
    if (inUntrackedScope) {
      return;
    }

    if (areSignalsProhibited) {
      throw new Error('Signal read is prohibited in this scope');
    }
  }

  notifyWrite() {
    // Separate if statements so it's possible to place a debugger breakpoint on `!inUntrackedScope` condition.
    if (inUntrackedScope) {
      return;
    }

    if (areSignalsProhibited) {
      throw new Error('Signal write is prohibited in this scope');
    }
  }
}

registerSignalRuntime({
  createSignal: (debugInfo) => new GuardSignal(debugInfo),
  batch: (cb) => {
    cb();
  },
  untracked: (cb) => {
    const prev = inUntrackedScope;
    try {
      inUntrackedScope = true;
      return cb();
    } finally {
      inUntrackedScope = prev;
    }
  },
});

/**
 * Prohibit signal actions within the given scope.
 */
export const prohibitSignalActions = <T>(cb: () => T) => {
  try {
    areSignalsProhibited = true;
    return cb();
  } finally {
    areSignalsProhibited = false;
  }
};
