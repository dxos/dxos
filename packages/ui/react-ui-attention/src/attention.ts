//
// Copyright 2024 DXOS.org
//

import { untracked } from '@preact/signals-core';
import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { type Live } from '@dxos/live-object';
import { ComplexMap } from '@dxos/util';

// NOTE: Chosen from RFC 1738's `safe` characters: http://www.faqs.org/rfcs/rfc1738.html
export const ATTENDABLE_PATH_SEPARATOR = '~';

const AttentionSchemaBase = Schema.mutable(
  Schema.Struct({
    hasAttention: Schema.Boolean,
    isAncestor: Schema.Boolean,
    isRelated: Schema.Boolean,
  }),
);

export const AttentionSchema = AttentionSchemaBase.pipe(
  Type.Obj({
    typename: 'dxos.org/type/Attention',
    version: '0.1.0',
  }),
);

export type Attention = Schema.Schema.Type<typeof AttentionSchema>;

const CurrentStateSchema = Schema.mutable(
  Schema.Struct({
    current: Schema.Array(Schema.String),
  }),
).pipe(
  Type.Obj({
    typename: 'dxos.org/type/AttentionState',
    version: '0.1.0',
  }),
);

// TODO(wittjosiah): Use mosaic path utility?
const stringKey = (key: string[]) => key.join(',');

/**
 * Manages attention state for an application.
 */
// TODO(wittjosiah): Write unit tests.
export class AttentionManager {
  // Each attention path is associated with an attention object.
  // The lookup is not a reactive object to ensure that attention for each path is subscribable independently.
  private readonly _map = new ComplexMap<string[], Live<Attention>>(stringKey);
  private readonly _state = Obj.make(CurrentStateSchema, { current: [] });

  constructor(initial: string[] = []) {
    if (initial.length > 0) {
      this.update(initial);
    }
  }

  /**
   * Currently attended element.
   *
   * @reactive
   */
  get current(): Live<readonly string[]> {
    return this._state.current;
  }

  /**
   * All attention paths.
   */
  keys(): string[][] {
    return Array.from(this._map.keys());
  }

  /**
   * Get the attention state for a given path.
   */
  get(key: string[]): Live<Attention> {
    const object = this._map.get(key);
    if (object) {
      return object;
    }

    const newObject = Obj.make(AttentionSchema, { hasAttention: false, isAncestor: false, isRelated: false });
    this._map.set(key, newObject);
    return newObject;
  }

  /**
   * Update the currently attended element.
   *
   * @internal
   */
  update(nextKey: string[]): void {
    const currentKey = untracked(() => this.current);
    const currentRelatedTo = currentKey[0];
    const nextRelatedTo = nextKey[0];

    // Ensure related attention object is initialized.
    this.get([nextRelatedTo]);

    const currentRelatedKeys = this.keys().filter((key) => key[0] === currentRelatedTo);
    const nextRelatedKeys = this.keys().filter(
      (key) => key[0] === nextRelatedTo && stringKey(key) !== stringKey(nextKey),
    );
    const prevRelatedKeys = currentRelatedKeys.filter(
      (curr) => !nextRelatedKeys.find((next) => stringKey(curr) === stringKey(next)),
    );

    const currentAncestorKeys = currentKey.slice(1).map((_, i) => currentKey.slice(i + 1, currentKey.length));
    const nextAncestorKeys = nextKey.slice(1).map((_, i) => nextKey.slice(i + 1, nextKey.length));
    const prevAncestorKeys = currentAncestorKeys.filter(
      (curr) => !nextAncestorKeys.find((next) => stringKey(curr) === stringKey(next)),
    );

    this._state.current = nextKey;
    prevRelatedKeys.forEach((key) => this._set(key, {}));
    prevAncestorKeys.forEach((key) => this._set(key, {}));
    nextRelatedKeys.forEach((key) => this._set(key, { isRelated: true }));
    nextAncestorKeys.forEach((key) => this._set(key, { isAncestor: true }));
    this._set(nextKey, { hasAttention: true });
  }

  private _set(key: string[], attention: Partial<Attention>): void {
    const object = this.get(key);
    object.hasAttention = attention.hasAttention ?? false;
    object.isAncestor = attention.isAncestor ?? false;
    object.isRelated = attention.isRelated ?? false;
  }
}

/**
 * Accumulates all attendable id’s between the element provided and the root, inclusive.
 */
export const getAttendables = (selector: string, cursor: Element, acc: string[] = []): string[] => {
  // Find the closest element with `data-attendable-id`, if any; start from cursor and move up the DOM tree.
  const closestAttendable = cursor.closest(selector);
  if (closestAttendable) {
    const attendableId = closestAttendable.getAttribute('data-attendable-id');
    if (!attendableId) {
      // This has an id of an aria-controls elsewhere on the page, move cursor to that trigger.
      const trigger = document.querySelector(`[aria-controls="${closestAttendable.getAttribute('id')}"]`);
      if (!trigger) {
        return acc;
      } else {
        return getAttendables(selector, trigger, acc);
      }
    } else {
      acc.push(...attendableId.split(ATTENDABLE_PATH_SEPARATOR));
      // TODO: Attempt tail recursion.
      return !closestAttendable.parentElement ? acc : getAttendables(selector, closestAttendable.parentElement, acc);
    }
  }

  return [...new Set(acc)];
};

export type AttendableId = { attendableId?: string };

export type Related = { related?: boolean };
