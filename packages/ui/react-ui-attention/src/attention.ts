//
// Copyright 2024 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';

import { type Attention } from './types';

/**
 * Manages attention state for an application.
 * Attention keys are slash-qualified graph IDs; ancestry is derived from progressive prefixes.
 */
export class AttentionManager {
  private readonly _map = new Map<string, Atom.Writable<Attention>>();
  private readonly _currentAtom: Atom.Writable<string[]>;

  constructor(
    private readonly _registry: Registry.Registry,
    initial: string[] = [],
  ) {
    this._currentAtom = Atom.make<string[]>([]).pipe(Atom.keepAlive);
    if (initial.length > 0) {
      this.update(initial);
    }
  }

  /**
   * Atom for the currently attended element IDs.
   */
  get current(): Atom.Atom<string[]> {
    return this._currentAtom;
  }

  /**
   * Gets the currently attended element IDs.
   */
  getCurrent(): readonly string[] {
    return this._registry.get(this._currentAtom);
  }

  /**
   * Subscribe to changes in the current attention IDs.
   */
  subscribeCurrent(cb: (current: readonly string[]) => void): () => void {
    this._registry.get(this._currentAtom);
    return this._registry.subscribe(this._currentAtom, () => {
      cb(this._registry.get(this._currentAtom));
    });
  }

  /**
   * All tracked qualified IDs.
   */
  keys(): string[] {
    return Array.from(this._map.keys());
  }

  /**
   * Get the attention state for a given qualified ID.
   */
  get(id: string): Attention {
    const atom = this._getAtom(id);
    return this._registry.get(atom);
  }

  /**
   * Subscribe to changes in the attention state for a given qualified ID.
   */
  subscribe(id: string, cb: (attention: Attention) => void): () => void {
    const atom = this._getAtom(id);
    this._registry.get(atom);
    return this._registry.subscribe(atom, () => {
      cb(this._registry.get(atom));
    });
  }

  private _getAtom(id: string): Atom.Writable<Attention> {
    const existing = this._map.get(id);
    if (existing) {
      return existing;
    }

    const newAtom = Atom.make<Attention>({ hasAttention: false, isAncestor: false, isRelated: false }).pipe(
      Atom.keepAlive,
    );
    this._map.set(id, newAtom);
    return newAtom;
  }

  /**
   * Update the currently attended element.
   * Takes the array of qualified IDs collected from the DOM; the first element is the primary attended item.
   * Ancestry is derived from the progressive prefixes of the primary ID.
   * Relatedness is derived from the segment ID: any tracked key whose last `/` segment matches the
   * attended ID's segment ID is marked `isRelated`. Additionally, if the primary ID has a
   * separator-prefixed last segment (starts with `~`), its immediate parent gets `isRelated` alongside `isAncestor`.
   *
   * @internal
   */
  update(nextIds: string[]): void {
    const primaryId = nextIds[0];
    if (!primaryId) {
      return;
    }

    const currentIds = this.getCurrent();
    const prevPrimaryId = currentIds[0];
    // Clear previous attention state: ancestors, primary, and related keys.
    if (prevPrimaryId) {
      const prevPrefixes = expandAttendableId(prevPrimaryId);
      for (const prefix of prevPrefixes) {
        this._set(prefix, {});
      }
      const prevSegmentId = getSegmentId(prevPrimaryId);
      for (const key of this.keys()) {
        if (getSegmentId(key) === prevSegmentId) {
          this._set(key, {});
        }
      }
    }

    this._registry.set(this._currentAtom, nextIds);

    // Set ancestors and primary.
    const prefixes = expandAttendableId(primaryId);
    const prefixSet = new Set(prefixes);
    const separatedParent = isSeparatorPrefixed(primaryId) ? getParentId(primaryId) : undefined;

    for (const prefix of prefixes) {
      if (prefix === primaryId) {
        this._set(prefix, { hasAttention: true });
      } else if (prefix === separatedParent) {
        this._set(prefix, { isAncestor: true, isRelated: true });
      } else {
        this._set(prefix, { isAncestor: true });
      }
    }

    // Set related keys: any tracked key sharing the same segment ID.
    const segmentId = getSegmentId(primaryId);
    for (const key of this.keys()) {
      if (!prefixSet.has(key) && getSegmentId(key) === segmentId) {
        this._set(key, { isRelated: true });
      }
    }
  }

  private _set(id: string, attention: Partial<Attention>): void {
    const atom = this._getAtom(id);
    this._registry.set(atom, {
      hasAttention: attention.hasAttention ?? false,
      isAncestor: attention.isAncestor ?? false,
      isRelated: attention.isRelated ?? false,
    });
  }
}

/**
 * Accumulates all attendable IDs between the element provided and the root, inclusive.
 * Each `data-attendable-id` value is treated as a single qualified ID (no splitting).
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
      acc.push(attendableId);
      return !closestAttendable.parentElement ? acc : getAttendables(selector, closestAttendable.parentElement, acc);
    }
  }

  return [...new Set(acc)];
};

export type AttendableId = { attendableId?: string };

export type Related = { related?: boolean };

const ATTENDABLE_PATH_SEPARATOR = '~';

/**
 * Decompose a qualified graph ID into progressive prefixes for ancestry tracking.
 * e.g. `root/a/b/c` yields `['root', 'root/a', 'root/a/b', 'root/a/b/c']`.
 */
export const expandAttendableId = (qualifiedId: string): string[] => {
  const segments = qualifiedId.split('/');
  return segments.map((_, index) => segments.slice(0, index + 1).join('/'));
};

/**
 * Whether the last segment of a qualified ID starts with the attendable path separator.
 */
export const isSeparatorPrefixed = (qualifiedId: string): boolean => {
  const lastSegment = qualifiedId.split('/').pop() ?? '';
  return lastSegment.startsWith(ATTENDABLE_PATH_SEPARATOR);
};

/**
 * Get the parent qualified ID (everything before the last `/` segment).
 */
export const getParentId = (qualifiedId: string | undefined): string | undefined => {
  if (!qualifiedId) {
    return undefined;
  }

  const lastSlash = qualifiedId.lastIndexOf('/');
  return lastSlash > 0 ? qualifiedId.slice(0, lastSlash) : undefined;
};

/**
 * Extract the segment ID (last segment) of a qualified ID.
 */
export const getSegmentId = (qualifiedId: string): string => {
  return qualifiedId.split('/').pop() ?? qualifiedId;
};
