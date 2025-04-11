//
// Copyright 2025 DXOS.org
//

export type CleanupFn = () => void;

export const combine = (...cleanupFns: CleanupFn[]): CleanupFn => {
  return () => {
    cleanupFns.forEach((cleanupFn) => cleanupFn());
  };
};

/**
 * Set of event unsubscribe callbacks, which can be garbage collected.
 */
export class Subscriptions {
  private readonly _cleanupFns: CleanupFn[] = [];

  add(cb: CleanupFn) {
    this._cleanupFns.push(cb);
    return this;
  }

  clear() {
    this._cleanupFns.forEach((cb) => cb());
    this._cleanupFns.length = 0;
  }
}
