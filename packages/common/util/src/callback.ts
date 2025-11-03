//
// Copyright 2022 DXOS.org
//

import { invariant } from '@dxos/invariant';

/**
 * Represents a callback that can be set once.
 *
 * Common usage is dependency injection.
 * In contrast to events, callbacks can only have one handler,
 * are executed synchronously,
 * and can return results.
 */
// TODO(burdon): Move to @dxos/async.
export class Callback<T extends (...args: any[]) => any> {
  private _callback: T | undefined;

  public call(...args: Parameters<T>): ReturnType<T> {
    invariant(this._callback, 'Callback not set');
    return this._callback(...args);
  }

  public callIfSet(...args: Parameters<T>): ReturnType<T> | undefined {
    return this._callback?.(...args);
  }

  public set(callback: T): void {
    invariant(!this._callback, 'Callback already set');
    this._callback = callback;
  }

  public isSet(): boolean {
    return !!this._callback;
  }
}

export type SetCallbacks<T> = { handlers: Set<T> };

/**
 * Create a fan-out callback handler.
 * NOTE: Methods cannot return values.
 */
export const createSetDispatch = <T extends {}>({ handlers }: SetCallbacks<T>) => {
  type Obj = { [i: string | symbol]: any };
  return new Proxy<any>(
    {
      handlers,
    },
    {
      get:
        (target: Obj, prop) =>
        (...args: any[]) => {
          handlers.forEach((handler: Obj) => {
            const method = handler[prop];
            if (method) {
              method.apply(handler, args);
            }
          });
        },
    },
  );
};
