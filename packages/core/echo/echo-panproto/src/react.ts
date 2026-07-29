//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useMemo } from 'react';

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
 * Reactivity comes from the base object's own atom: a lens adds no state of its own, so any change to
 * the object — including one replicated from another peer, and including an overlay value in the
 * object's annotations — reprojects the view.
 */
export const useLensValue = <S extends Obj.Unknown, T extends Record<string, any>, K extends keyof T & string>(
  obj: S | undefined,
  lens: Lens.Lens<any, T>,
  property?: K,
): any => {
  const atom = useMemo(() => {
    if (obj == null) {
      return Atom.make<undefined>(() => undefined);
    }
    const source = Obj.atom(obj);
    return Atom.make((get) => {
      // Depend on the object snapshot so the view recomputes on every change, then read through the
      // lens (which needs the live object, not the snapshot, to resolve refs and overlays).
      get(source);
      const view = Lens.get(obj, lens);
      return property === undefined ? view : view[property];
    });
  }, [obj, lens, property]);

  return useAtomValue(atom as any);
};
