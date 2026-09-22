//
// Copyright 2026 DXOS.org
//

import { diff } from '@codemirror/merge';

/** A document change, in the shape CodeMirror's `dispatch` takes. */
export type DocChange = {
  from: number;
  to: number;
  insert: string;
};

export type DocChangesOptions = {
  /**
   * How long the diff may run before it gives up on precision. Past this it falls back to a
   * coarser diff, and a whole-document replacement is always the floor.
   */
  timeout?: number;
  /** Caps the depth of the expensive diff, so a large, wholly different document stays linear. */
  scanLimit?: number;
  /** Above this, a document is replaced outright rather than diffed. */
  maxLength?: number;
};

const DEFAULT_TIMEOUT = 50;
const DEFAULT_SCAN_LIMIT = 500;
const DEFAULT_MAX_LENGTH = 4_000_000;

/**
 * The changes that turn `current` into `next`, as narrowly as the diff can see them.
 *
 * Replacing a whole document discards everything anchored to positions in it — folds, the
 * selection, the scroll position — so a view that re-receives a value it mostly already has
 * dispatches only what moved. The result always produces `next` exactly; the worst case is the
 * single whole-document change that replacing it outright would have been.
 */
export const computeDocChanges = (
  current: string,
  next: string,
  { timeout = DEFAULT_TIMEOUT, scanLimit = DEFAULT_SCAN_LIMIT, maxLength = DEFAULT_MAX_LENGTH }: DocChangesOptions = {},
): DocChange[] => {
  if (current === next) {
    return [];
  }

  const replaceAll: DocChange[] = [{ from: 0, to: current.length, insert: next }];
  if (current.length === 0 || next.length === 0 || current.length > maxLength || next.length > maxLength) {
    return replaceAll;
  }

  const changes = diff(current, next, { timeout, scanLimit });
  if (changes.length === 0) {
    return [];
  }

  // A diff that rewrites everything is the replacement, and dispatching it as one change is cheaper.
  if (changes.length === 1 && changes[0].fromA === 0 && changes[0].toA === current.length) {
    return replaceAll;
  }

  return changes.map((change) => ({
    from: change.fromA,
    to: change.toA,
    insert: next.slice(change.fromB, change.toB),
  }));
};
