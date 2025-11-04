//
// Copyright 2025 DXOS.org
//

import { ComplexMap, type PrimitiveProjection } from '@dxos/util';

export type CleanupFn = () => void;

/**
 * Combine multiple cleanup functions into a single cleanup function.
 * Can be used in effect hooks in conjunction with `addEventListener`.
 */
export const combine =
  (...cleanupFns: (CleanupFn | CleanupFn[])[]): CleanupFn =>
  () => {
    cleanupFns.flat().forEach((cleanupFn) => cleanupFn());
  };

export const timeout = (cb: Function, ms = 0): CleanupFn => {
  const t = setTimeout(cb, ms);
  return () => clearTimeout(t);
};

export const interval = (cb: Function, ms: number): CleanupFn => {
  const t = setInterval(cb, ms);
  return () => clearInterval(t);
};

type EventMap<T> = T extends Window
  ? WindowEventMap
  : T extends Document
    ? DocumentEventMap
    : T extends HTMLElement
      ? HTMLElementEventMap
      : Record<string, Event>;

/**
 * Add the event listener and return a cleanup function.
 * Can be used in effect hooks in conjunction with `combine`.
 */
export const addEventListener = <T extends EventTarget, K extends keyof EventMap<T>>(
  target: T,
  type: K,
  listener: (this: T, ev: EventMap<T>[K]) => any,
  options?: boolean | AddEventListenerOptions,
): CleanupFn => {
  target.addEventListener(type as string, listener as EventListener, options);
  return () => target.removeEventListener(type as string, listener as EventListener, options);
};

export class SubscriptionList {
  private readonly _cleanups: CleanupFn[] = [];

  add(cb: CleanupFn): this {
    this._cleanups.push(cb);
    return this;
  }

  clear(): void {
    this._cleanups.forEach((cb) => cb());
    this._cleanups.length = 0;
  }
}

export class SubscriptionSet<T = any> {
  private readonly _cleanupMap: ComplexMap<T, CleanupFn>;

  constructor(keyProjection: PrimitiveProjection<T>) {
    this._cleanupMap = new ComplexMap<T, CleanupFn>(keyProjection);
  }

  set(key: T, cb: CleanupFn): this {
    this._cleanupMap.set(key, cb);
    return this;
  }

  clear(): void {
    this._cleanupMap.forEach((cb) => cb());
    this._cleanupMap.clear();
  }
}
