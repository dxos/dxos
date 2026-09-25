//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';

import { Draft, Op } from '@dxos/automerge-proxy';

//
// The Automerge calls the database layer makes directly, routed to the mirror when the document is
// one. A tab without Automerge would keep only the mirror branch of each.
//

/** Confirmed heads of each mirror snapshot handed out; local (unattached) documents have none. */
const mirrorHeads = new WeakMap<object, readonly string[]>();

/** Registers a mirror snapshot so {@link getHeads} can answer for it. */
export const registerMirrorDoc = <T>(doc: T, heads: readonly string[]): T => {
  if (typeof doc === 'object' && doc !== null) {
    mirrorHeads.set(doc, heads);
  }
  return doc;
};

export const isMirrorDoc = (doc: object): boolean => mirrorHeads.has(doc);

/** Heads of a document; for a mirror these are the last confirmed ones and lag unconfirmed edits. */
export const getHeads = (doc: object): Heads => {
  const heads = mirrorHeads.get(doc);
  return heads ? [...heads] : A.getHeads(doc);
};

/** Whether the document has seen every change in `heads`; a mirror only knows its own frontier. */
export const hasHeads = (doc: object, heads: Heads): boolean => {
  const current = mirrorHeads.get(doc);
  if (current) {
    return heads.every((head) => current.includes(head));
  }
  return A.hasHeads(doc, heads);
};

/** `A.splice` for a change callback's draft, whichever kind of document it drafts. */
export const splice = (
  draft: object,
  path: readonly (string | number)[],
  index: number,
  remove: number,
  insert: string,
): void => {
  if (!Draft.splice(draft, path, index, remove, insert)) {
    A.splice(draft, path.slice(), index, remove, insert);
  }
};

/** `A.updateText` for a change callback's draft. */
export const updateText = (draft: object, path: readonly (string | number)[], text: string): void => {
  if (!Draft.updateText(draft, path, text)) {
    A.updateText(draft, path.slice(), text);
  }
};

/** A document for an object not yet added to a database. */
export const createLocalDoc = <T extends Record<string, unknown>>(value: T, mirror: boolean): A.Doc<T> =>
  mirror ? registerMirrorDoc(Op.freeze(value), []) : A.from<T>(value);

/** `A.change` for a local document of either kind. */
export const changeLocalDoc = <T>(doc: A.Doc<T>, callback: A.ChangeFn<T>, options?: A.ChangeOptions<T>): A.Doc<T> => {
  if (!isMirrorDoc(doc)) {
    return options ? A.change(doc, options, callback) : A.change(doc, callback);
  }
  const recorder = new Draft.Recorder(doc);
  // The draft emulates the document the callback expects; its type cannot be derived from a Proxy.
  callback(recorder.draft() as T);
  return registerMirrorDoc(recorder.current, []);
};
