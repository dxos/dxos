//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Err from './Err';
import * as internal from './internal';
import * as Obj from './Obj';

/**
 * A key path addressing a string value within an object, mirroring `Obj.getValue` / `Obj.setValue`.
 */
export type KeyPath = readonly (string | number)[];

/**
 * A single find/replace edit applied to a string field. When `oldString` is missing or empty the
 * `newString` is appended to the end of the current value.
 */
export type Edit = {
  oldString?: string;
  newString: string;
  replaceAll?: boolean;
};

/**
 * Replace the string CRDT value at `path` with `newText`.
 *
 * For database-backed objects the change is applied as a minimal Automerge diff (preserving cursors,
 * anchors, and merging cleanly with concurrent edits); for in-memory objects it is a plain assignment.
 *
 * Must be called inside `Obj.update(obj, () => { ... })`.
 */
export const update = (obj: Obj.Unknown, path: KeyPath | string | number, newText: string): void => {
  const { handler, target } = resolve(obj, 'update');
  if (typeof handler.textUpdate !== 'function') {
    throw new Err.TextNotSupportedError('update');
  }
  handler.textUpdate(target, normalizePath(path), newText);
};

/**
 * Splice the string CRDT value at `path` by character index, mirroring `Array.prototype.splice`:
 * remove `deleteCount` characters at `start` and insert `insert`. Returns the removed substring.
 *
 * Must be called inside `Obj.update(obj, () => { ... })`.
 */
export const splice = (
  obj: Obj.Unknown,
  path: KeyPath | string | number,
  start: number,
  deleteCount: number,
  insert = '',
): string => {
  const { handler, target } = resolve(obj, 'splice');
  if (typeof handler.textSplice !== 'function') {
    throw new Err.TextNotSupportedError('splice');
  }
  return handler.textSplice(target, normalizePath(path), start, deleteCount, insert);
};

/**
 * Apply a sequence of find/replace {@link Edit}s to the string value at `path`, returning the resulting
 * full string. Implemented on top of {@link splice} so it works for both backends.
 *
 * An edit with a missing or empty `oldString` appends its `newString`. A non-`replaceAll` edit whose
 * `oldString` is not found throws {@link Err.TextEditNotFoundError}.
 *
 * Must be called inside `Obj.update(obj, () => { ... })`.
 */
export const applyEdits = (obj: Obj.Unknown, path: KeyPath | string | number, edits: readonly Edit[]): string => {
  const keyPath = normalizePath(path);
  for (const edit of edits) {
    const text: string = Obj.getValue(obj, keyPath) ?? '';
    if (edit.oldString == null || edit.oldString.length === 0) {
      // Append: an empty match would loop forever in `replaceAll`, so treat it as an append instead.
      splice(obj, keyPath, text.length, 0, edit.newString);
      continue;
    }

    if (edit.replaceAll) {
      let idx = text.indexOf(edit.oldString);
      while (idx !== -1) {
        splice(obj, keyPath, idx, edit.oldString.length, edit.newString);
        const updated: string = Obj.getValue(obj, keyPath) ?? '';
        // Resume past the inserted text so a `newString` that contains `oldString` is not re-matched.
        idx = updated.indexOf(edit.oldString, idx + edit.newString.length);
      }
    } else {
      const idx = text.indexOf(edit.oldString);
      if (idx === -1) {
        throw new Err.TextEditNotFoundError(edit.oldString);
      }
      splice(obj, keyPath, idx, edit.oldString.length, edit.newString);
    }
  }

  return Obj.getValue(obj, keyPath) ?? '';
};

const normalizePath = (path: KeyPath | string | number): KeyPath =>
  typeof path === 'string' || typeof path === 'number' ? [path] : path;

/**
 * Resolve the reactive handler and raw target for `obj`. The handler is shared between the in-memory
 * and database-backed proxy systems, so this is the single dispatch seam for both backends. Snapshots
 * and non-reactive values are not proxies and cannot be edited.
 */
const resolve = (obj: Obj.Unknown, operation: string) => {
  if (!internal.isProxy(obj)) {
    throw new Err.TextNotSupportedError(operation);
  }
  const handler = internal.getProxyHandler(obj);
  const target = internal.getProxyTarget(obj);
  return { handler, target };
};
