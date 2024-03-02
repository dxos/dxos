import { registerSignalRuntime, type GenericSignal } from '@dxos/echo-signals/runtime';

//
// This module is used to guard against ECHO subscribing to signals within it's internals.
//

let areSignalsProhibited = false;

const signalGuard: GenericSignal = {
  notifyRead() {
    if (areSignalsProhibited) {
      throw new Error('Signal read is prohibited in this scope');
    }
  },
  notifyWrite() {
    if (areSignalsProhibited) {
      throw new Error('Signal write is prohibited in this scope');
    }
  },
};

registerSignalRuntime({
  createSignal() {
    return signalGuard;
  },
  batch(cb) {
    cb();
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
