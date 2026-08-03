//
// Copyright 2024 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom';

export type Attention = {
  hasAttention: boolean;
  isAncestor: boolean;
  isRelated: boolean;
};

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
   * attended ID's segment ID is marked `isRelated`. Linked segments relate in both directions: if the
   * primary ID is one (starts with `~`), its immediate parent gets `isRelated` alongside `isAncestor`;
   * conversely a tracked linked child of the primary ID is `isRelated`, so a companion pinned to a node
   * reads as attended while that node is.
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
        if (getSegmentId(key) === prevSegmentId || isLinkedChildOf(key, prevPrimaryId)) {
          this._set(key, {});
        }
      }
    }

    this._registry.set(this._currentAtom, nextIds);

    // Set ancestors and primary.
    const prefixes = expandAttendableId(primaryId);
    const prefixSet = new Set(prefixes);
    const linkedParent = isLinkedSegment(primaryId) ? getParentId(primaryId) : undefined;

    for (const prefix of prefixes) {
      if (prefix === primaryId) {
        this._set(prefix, { hasAttention: true });
      } else if (prefix === linkedParent) {
        this._set(prefix, { isAncestor: true, isRelated: true });
      } else {
        this._set(prefix, { isAncestor: true });
      }
    }

    // Set related keys: any tracked key sharing the same segment ID, plus this node's linked children.
    const segmentId = getSegmentId(primaryId);
    for (const key of this.keys()) {
      if (!prefixSet.has(key) && (getSegmentId(key) === segmentId || isLinkedChildOf(key, primaryId))) {
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

/** The attribute marking an element as attendable, carrying its qualified id. */
export const ATTENDABLE_ATTRIBUTE = 'data-attendable-id';

/** Selector matching any attendable element. */
export const ATTENDABLE_SELECTOR = `[${ATTENDABLE_ATTRIBUTE}]`;

/**
 * Accumulates all attendable IDs between the element provided and the root, inclusive.
 * Each `data-attendable-id` value is treated as a single qualified ID (no splitting).
 */
export const getAttendables = (selector: string, cursor: Element, acc: string[] = []): string[] => {
  // Find the closest element with `data-attendable-id`, if any; start from cursor and move up the DOM tree.
  const closestAttendable = cursor.closest(selector);
  if (closestAttendable) {
    const attendableId = closestAttendable.getAttribute(ATTENDABLE_ATTRIBUTE);
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

/**
 * The outermost attendable ancestor of `element` — the root of any nested attendables (e.g. a section
 * within a stack). Structural (real DOM ancestry), so it is independent of what currently has attention.
 * Resolve it from an in-DOM element: a portaled subtree (a menu, a popover) is not under its own
 * attendable, so walk from the trigger or anchor instead.
 */
export const getRootAttendableId = (element: Element): string | undefined =>
  getAttendables(ATTENDABLE_SELECTOR, element).at(-1);

export type AttendableId = { attendableId?: string };

export type Related = { related?: boolean };

/**
 * Prefix for linked segments. A linked segment's attention state is shared with its parent:
 * when a linked node has attention, the parent is marked as both ancestor and related.
 */
const LINKED_PREFIX = '~';

/**
 * Decompose a qualified graph ID into progressive prefixes for ancestry tracking.
 * e.g. `root/a/b/c` yields `['root', 'root/a', 'root/a/b', 'root/a/b/c']`.
 */
export const expandAttendableId = (qualifiedId: string): string[] => {
  const segments = qualifiedId.split('/');
  return segments.map((_, index) => segments.slice(0, index + 1).join('/'));
};

/**
 * Whether the last segment of a qualified ID is a linked segment (starts with `~`).
 * Linked segments share their attention state with the parent node.
 */
export const isLinkedSegment = (qualifiedId: string): boolean => {
  const lastSegment = qualifiedId.split('/').pop() ?? '';
  return lastSegment.startsWith(LINKED_PREFIX);
};

/**
 * Build a linked segment ID from a variant name (e.g., `'settings'` -> `'~settings'`).
 * Nodes identified by linked segments share their attention state with the parent node.
 */
export const linkedSegment = (variant: string): string => `${LINKED_PREFIX}${variant}`;

/**
 * Extract the variant name from the last segment of a qualified ID, stripping the linked prefix.
 * e.g. `'root/space/obj/~settings'` -> `'settings'`.
 * If the segment is not linked (no `~` prefix), returns the segment as-is.
 */
export const getLinkedVariant = (qualifiedId: string): string => {
  const lastSegment = qualifiedId.split('/').pop() ?? '';
  return lastSegment.startsWith(LINKED_PREFIX) ? lastSegment.slice(LINKED_PREFIX.length) : lastSegment;
};

/** Whether `id` is an immediate linked (`~`) child of `parentId` — e.g. a companion of that node. */
const isLinkedChildOf = (id: string, parentId: string | undefined): boolean =>
  !!parentId && isLinkedSegment(id) && getParentId(id) === parentId;

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
