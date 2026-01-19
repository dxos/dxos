//
// Copyright 2025 DXOS.org
//

import * as Atom from '@effect-atom/atom/Atom';
import isEqual from 'lodash.isequal';

import { type Entity, Obj } from '@dxos/echo';
import { isEchoObject } from '@dxos/echo-db';
import type { KeyPath } from '@dxos/echo-db';
import { assertArgument } from '@dxos/invariant';

/**
 * Atom value structure that includes metadata.
 */
export interface AtomValue<T> {
  readonly obj: Entity.Unknown;
  readonly path: KeyPath;
  readonly value: T;
}

/**
 * Namespace for Echo Atom utility functions.
 */
export namespace AtomObj {
  /**
   * Create a read-only atom for an entire Echo object.
   * The atom updates automatically when the object is mutated.
   */
  export function make<T extends Entity.Unknown>(obj: T): Atom.Atom<AtomValue<T>> {
    assertArgument(isEchoObject(obj), 'obj', 'Object must be an Echo object');
    const path: KeyPath = [];

    return Atom.make<AtomValue<T>>((get) => {
      const unsubscribe = Obj.subscribe(obj, () => {
        get.setSelf({ obj, path, value: obj });
      });

      get.addFinalizer(() => unsubscribe());

      return { obj, path, value: obj };
    });
  }

  /**
   * Create a read-only atom for a specific property of an Echo object.
   * The atom updates automatically when the property is mutated.
   * Only fires updates when the property value actually changes.
   */
  export function makeProperty<T extends Entity.Unknown, K extends keyof T>(
    obj: T,
    key: K,
  ): Atom.Atom<AtomValue<T[K]>> {
    assertArgument(isEchoObject(obj), 'obj', 'Object must be an Echo object');
    assertArgument(key in obj, 'key', 'Property must exist on object');
    const path: KeyPath = [String(key)];

    return Atom.make<AtomValue<T[K]>>((get) => {
      let previousValue = obj[key];

      const unsubscribe = Obj.subscribe(obj, () => {
        const newValue = obj[key];
        if (!isEqual(previousValue, newValue)) {
          previousValue = newValue;
          get.setSelf({ obj, path, value: newValue });
        }
      });

      get.addFinalizer(() => unsubscribe());

      return { obj, path, value: obj[key] };
    });
  }
}
