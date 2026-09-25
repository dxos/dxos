//
// Copyright 2024 DXOS.org
//

import * as A from '@dxos/automerge-proxy/Automerge';
import { type Obj } from '@dxos/echo';
import { isProxy } from '@dxos/echo/internal';
import { assertArgument, invariant } from '@dxos/invariant';
import { getDeep } from '@dxos/util';

import * as Doc from './automerge/Doc.ts';
import { getObjectCore } from './echo-handler/index.ts';
import { heldReplica } from './replica.ts';

/** Where cursors for an accessor resolve, and how positions in its text map to and from there. */
type CursorTarget = {
  accessor: Doc.Accessor;
  toTarget: (position: number) => number;
  fromTarget: (position: number) => number;
};

/**
 * A mirror has no op ids, so cursors for a mirrored document come from the replica an open editor
 * holds. The replica can trail the mirror by a round trip, so positions map through the difference
 * between the two texts.
 */
const cursorTarget = (accessor: Doc.Accessor): CursorTarget => {
  if (!A.isProxy(accessor.handle.doc())) {
    return { accessor, toTarget: (position) => position, fromTarget: (position) => position };
  }
  const replica = heldReplica(accessor);
  if (!replica) {
    throw new Error('Cursors in a mirrored document need a replica of it (see leaseReplica).');
  }
  const mirrorText = textAt(accessor);
  const replicaText = textAt(replica);
  return {
    accessor: replica,
    toTarget: (position) => mapPosition(mirrorText, replicaText, position),
    fromTarget: (position) => mapPosition(replicaText, mirrorText, position),
  };
};

const textAt = (accessor: Doc.Accessor): string => {
  const value = getDeep(accessor.handle.doc(), accessor.path);
  return typeof value === 'string' ? value : '';
};

/**
 * Moves a character position in `from` to the same character in `to`, where the two differ in one
 * span; a position inside text only `from` has moves to the start of that span.
 */
const mapPosition = (from: string, to: string, position: number): number => {
  if (from === to) {
    return position;
  }
  const shorter = Math.min(from.length, to.length);
  let prefix = 0;
  while (prefix < shorter && from.charCodeAt(prefix) === to.charCodeAt(prefix)) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < shorter - prefix &&
    from.charCodeAt(from.length - 1 - suffix) === to.charCodeAt(to.length - 1 - suffix)
  ) {
    suffix++;
  }
  if (position < prefix) {
    return position;
  }
  if (position >= from.length - suffix) {
    return position - from.length + to.length;
  }
  return prefix;
};

// TODO(burdon): Handle assoc to associate with a previous character.
export const toCursor = (accessor: Doc.Accessor, pos: number, assoc = 0): A.Cursor => {
  const { accessor: target, toTarget } = cursorTarget(accessor);
  const doc = target.handle.doc();
  const value = getDeep(doc, target.path);
  const position = toTarget(pos);
  if (typeof value === 'string' && value.length <= position) {
    return 'end';
  }

  // NOTE: Slice is needed because getCursor mutates the array.
  return A.getCursor(doc, target.path.slice(), position);
};

export const toCursorRange = (accessor: Doc.Accessor, start: number, end: number) => {
  return `${toCursor(accessor, start)}:${toCursor(accessor, end)}`;
};

export const fromCursor = (accessor: Doc.Accessor, cursor: A.Cursor): number => {
  if (cursor === '') {
    return 0;
  }

  if (cursor === 'end') {
    const value = getDeep(accessor.handle.doc(), accessor.path);
    if (typeof value === 'string') {
      return value.length;
    } else {
      return 0;
    }
  }

  const { accessor: target, fromTarget } = cursorTarget(accessor);
  // NOTE: Slice is needed because getCursor mutates the array.
  return fromTarget(A.getCursorPosition(target.handle.doc(), target.path.slice(), cursor));
};

/**
 * Return the text value between two cursor positions.
 */
export const getTextInRange = (accessor: Doc.Accessor, start: string, end: string): string | undefined => {
  const doc = accessor.handle.doc();
  const value = getDeep(doc, accessor.path);
  if (typeof value === 'string') {
    const beginIdx = fromCursor(accessor, start);
    const endIdx = fromCursor(accessor, end);
    if (beginIdx <= value.length) {
      return value.slice(beginIdx, endIdx);
    }
  }
};

/** Return the text spanned by an anchor string (`"${fromCursor}:${toCursor}"`). */
export const getTextInAnchorRange = (accessor: Doc.Accessor, anchor: string): string | undefined => {
  // Reject extra delimiters; empty tokens stay accepted as the defined ''/'end' cursor sentinels.
  const [start, end, ...rest] = anchor.split(':');
  if (start === undefined || end === undefined || rest.length > 0) {
    return undefined;
  }
  return getTextInRange(accessor, start, end);
};

export const getRangeFromCursor = (accessor: Doc.Accessor, cursor: string) => {
  const [start, end] = cursor.split(':');
  if (start === undefined || end === undefined) {
    return undefined;
  }

  return { start: fromCursor(accessor, start), end: fromCursor(accessor, end) };
};

/**
 * Helper that updates the text value at the given path. Caller must ensure the path is valid.
 * @param obj - The object to update.
 * @param path - The path to the text value to update.
 * @param newText - The new text value.
 * @returns The updated object.
 */
export const updateText = <T extends Obj.Unknown>(obj: T, path: Doc.KeyPath, newText: string): T => {
  assertArgument(isProxy(obj), 'obj');
  invariant(path === undefined || Doc.isKeyPath(path));
  const accessor = getObjectCore(obj).getDocAccessor(path);
  accessor.handle.change((doc) => {
    A.updateText(doc, accessor.path.slice(), newText);
  });
  return obj;
};
