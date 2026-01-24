//
// Copyright 2024 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';

import { ComplexMap } from '@dxos/util';

import { ATTENDABLE_PATH_SEPARATOR, type Attention } from './types';

// TODO(wittjosiah): Use mosaic path utility?
const stringKey = (key: string[]) => key.join(',');

/**
 * Manages attention state for an application.
 */
export class AttentionManager {
  // Each attention path is associated with an attention atom.
  // The lookup is not a reactive object to ensure that attention for each path is subscribable independently.
  private readonly _map = new ComplexMap<string[], Atom.Writable<Attention>>(stringKey);
  private readonly _currentAtom: Atom.Writable<string[]>;

  constructor(
    private readonly _registry: Registry.Registry,
    initial: string[] = [],
  ) {
    this._currentAtom = Atom.make<string[]>([]);
    if (initial.length > 0) {
      this.update(initial);
    }
  }

  /**
   * Atom for the currently attended element path.
   */
  get current(): Atom.Atom<string[]> {
    return this._currentAtom;
  }

  /**
   * Gets the currently attended element path.
   */
  getCurrent(): readonly string[] {
    return this._registry.get(this._currentAtom);
  }

  /**
   * Subscribe to changes in the current attention path.
   */
  subscribeCurrent(cb: (current: readonly string[]) => void): () => void {
    this._registry.get(this._currentAtom);
    return this._registry.subscribe(this._currentAtom, () => {
      cb(this._registry.get(this._currentAtom));
    });
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
  get(key: string[]): Attention {
    const atom = this._getAtom(key);
    return this._registry.get(atom);
  }

  /**
   * Subscribe to changes in the attention state for a given path.
   */
  subscribe(key: string[], cb: (attention: Attention) => void): () => void {
    const atom = this._getAtom(key);
    this._registry.get(atom);
    return this._registry.subscribe(atom, () => {
      cb(this._registry.get(atom));
    });
  }

  private _getAtom(key: string[]): Atom.Writable<Attention> {
    const existing = this._map.get(key);
    if (existing) {
      return existing;
    }

    const newAtom = Atom.make<Attention>({ hasAttention: false, isAncestor: false, isRelated: false });
    this._map.set(key, newAtom);
    return newAtom;
  }

  /**
   * Update the currently attended element.
   *
   * @internal
   */
  update(nextKey: string[]): void {
    const currentKey = this.getCurrent();
    const currentRelatedTo = currentKey[0];
    const nextRelatedTo = nextKey[0];

    // Ensure related attention object is initialized.
    this._getAtom([nextRelatedTo]);

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

    this._registry.set(this._currentAtom, nextKey);
    prevRelatedKeys.forEach((key) => this._set(key, {}));
    prevAncestorKeys.forEach((key) => this._set(key, {}));
    nextRelatedKeys.forEach((key) => this._set(key, { isRelated: true }));
    nextAncestorKeys.forEach((key) => this._set(key, { isAncestor: true }));
    this._set(nextKey, { hasAttention: true });
  }

  private _set(key: string[], attention: Partial<Attention>): void {
    const atom = this._getAtom(key);
    this._registry.set(atom, {
      hasAttention: attention.hasAttention ?? false,
      isAncestor: attention.isAncestor ?? false,
      isRelated: attention.isRelated ?? false,
    });
  }
}

/**
 * Accumulates all attendable id's between the element provided and the root, inclusive.
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
