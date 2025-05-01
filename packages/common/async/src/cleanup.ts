//
// Copyright 2025 DXOS.org
//

import { ComplexMap, type PrimitiveProjection } from '@dxos/util';

export type CleanupFn = () => void;

/**
 * Combine multiple cleanup functions into a single cleanup function.
 * Can be used in effect hooks in conjunction with `addEventListener`.
 */
export const combine = (...cleanupFns: CleanupFn[]): CleanupFn => {
  return () => {
    cleanupFns.forEach((cleanupFn) => cleanupFn());
  };
};

/**
 * Add the event listener and return a cleanup function.
 * Can be used in effect hooks in conjunction with `combine`.
 */
export const addEventListener = <T extends Event = Event>(
  el: HTMLElement,
  event: string,
  handler: EventListenerOrEventListenerObject | ((event: T) => void),
  options?: boolean | AddEventListenerOptions,
): CleanupFn => {
  el.addEventListener(event, handler as EventListenerOrEventListenerObject, options);
  return () => el.removeEventListener(event, handler as EventListenerOrEventListenerObject, options);
};

export class SubscriptionList {
  private readonly _cleanups: CleanupFn[] = [];

  add(cb: CleanupFn) {
    this._cleanups.push(cb);
    return this;
  }

  clear() {
    this._cleanups.forEach((cb) => cb());
    this._cleanups.length = 0;
  }
}

export class SubscriptionSet<T = any> {
  private readonly _cleanupMap: ComplexMap<T, CleanupFn>;

  constructor(keyProjection: PrimitiveProjection<T>) {
    this._cleanupMap = new ComplexMap<T, CleanupFn>(keyProjection);
  }

  set(key: T, cb: CleanupFn) {
    this._cleanupMap.set(key, cb);
    return this;
  }

  clear() {
    this._cleanupMap.forEach((cb) => cb());
    this._cleanupMap.clear();
  }
}
