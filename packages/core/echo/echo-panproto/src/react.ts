//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useReducer } from 'react';

import { Obj } from '@dxos/echo';

import * as Lens from './Lens';

//
// React bindings for the object lens, on the `@dxos/echo-panproto/react` entrypoint so the main surface
// stays React-free (the wire runner loads in workers). Shaped like `@dxos/echo-react`'s `useObject`,
// and destined to move there — or into core alongside `Obj` — once the lens API is internalized;
// keeping it here means the whole lens surface lives in one package until then.
//
// There is one object under the hood: the view is derived from it on every change, and the update
// callback writes back through the lens, touching only the properties it assigns.
//

export type LensUpdateCallback<T> = (update: (view: Obj.Mutable<T>) => void) => void;

export interface LensPropUpdateCallback<V> {
  (update: (current: V) => V): void;
  (value: V): void;
}

export const useLens: {
  /**
   * Subscribe to a whole lensed view. Re-renders when any source property the lens reads changes.
   */
  <S extends Obj.Unknown, T extends Record<string, any>>(obj: S, lens: Lens.Lens<any, T>): [T, LensUpdateCallback<T>];

  <S extends Obj.Unknown, T extends Record<string, any>>(
    obj: S | undefined,
    lens: Lens.Lens<any, T>,
  ): [T | undefined, LensUpdateCallback<T>];

  /**
   * Subscribe to one property of a lensed view.
   *
   * Scoped to the source properties that property's mapping declares in `from`, so a peer editing an
   * unrelated field does not re-render this control.
   */
  <S extends Obj.Unknown, T extends Record<string, any>, K extends keyof T & string>(
    obj: S,
    lens: Lens.Lens<any, T>,
    property: K,
  ): [T[K], LensPropUpdateCallback<T[K]>];
} = (<S extends Obj.Unknown, T extends Record<string, any>, K extends keyof T & string>(
  obj: S | undefined,
  lens: Lens.Lens<any, T>,
  property?: K,
): any => {
  const view = useLensValue(obj, lens, property);

  const callback = useCallback(
    (updateOrValue: unknown) => {
      if (obj === undefined) {
        return;
      }

      if (property === undefined) {
        if (typeof updateOrValue !== 'function') {
          throw new Error('Cannot re-assign the entire view; assign properties inside the callback.');
        }
        Obj.update(Lens.of(obj, lens), (view: any) => (updateOrValue as (view: Obj.Mutable<T>) => void)(view));
        return;
      }

      const next =
        typeof updateOrValue === 'function'
          ? (updateOrValue as (current: unknown) => unknown)(Lens.get(obj, lens)[property])
          : updateOrValue;
      Lens.put(obj, lens, { [property]: next } as Partial<T>);
    },
    [obj, lens, property],
  );

  return [view, callback];
}) as any;

/**
 * The lensed view as a value, without an update callback.
 *
 * A lens holds no state of its own: the view is projected from the live object on every render, and
 * `Obj.subscribe` is only the signal that schedules one.
 */
export const useLensValue = <S extends Obj.Unknown, T extends Record<string, any>, K extends keyof T & string>(
  obj: S | undefined,
  lens: Lens.Lens<any, T>,
  property?: K,
): any => {
  const [, bump] = useReducer((value: number) => value + 1, 0);
  useEffect(() => (obj ? Obj.subscribe(obj, bump) : undefined), [obj, bump]);

  // Projected on every render rather than memoized against a change signal. The projection is pure and
  // cheap, and caching it behind a signal is how a lens over TEXT went stale: the subscription that
  // fires for a property assignment does not fire for every string-CRDT splice, so a cached view
  // survived edits the object had already taken.
  if (obj == null) {
    return undefined;
  }
  const view = Lens.get(obj, lens);
  return property === undefined ? view : view[property];
};
