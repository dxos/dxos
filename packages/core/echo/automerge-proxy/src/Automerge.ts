//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Cursor, type Heads, type Prop, next as A } from '@automerge/automerge';

import * as Draft from './Draft.ts';
import * as Handle from './Handle.ts';

// Automerge's whole API, so this namespace replaces an import of `@automerge/automerge`; the functions
// below shadow the ones a proxy document answers itself.
export * from '@automerge/automerge';

/** Whether `doc` is a document a proxy handle handed out, rather than an Automerge document. */
export const isProxy = (doc: object): boolean => Handle.isProxyDoc(doc);

/**
 * Automerge's `getHeads`. A proxy document answers with the heads its host last confirmed, which lag
 * its unconfirmed edits.
 */
export const getHeads = (doc: object): Heads => Handle.getHeads(doc) ?? A.getHeads(doc);

/** Automerge's `hasHeads`. A proxy document knows its confirmed frontier, not the history behind it. */
export const hasHeads = (doc: object, heads: Heads): boolean => {
  const current = Handle.getHeads(doc);
  return current ? heads.every((head) => current.includes(head)) : A.hasHeads(doc, heads);
};

/** Automerge's `splice`, which a proxy document's draft records as an op. */
export const splice = (
  doc: object,
  path: readonly Prop[],
  index: number | Cursor,
  del: number,
  newText?: string,
): void => {
  if (typeof index === 'string' && Draft.getInfo(doc)) {
    throw new TypeError('A proxy draft takes a numeric position, not a cursor');
  }
  if (typeof index === 'number' && Draft.splice(doc, path, index, del, newText ?? '')) {
    return;
  }
  A.splice(doc, [...path], index, del, newText);
};

/** Automerge's `updateText`, which a proxy document's draft records as the smallest splice. */
export const updateText = (doc: object, path: readonly Prop[], newText: string): void => {
  if (!Draft.updateText(doc, path, newText)) {
    A.updateText(doc, [...path], newText);
  }
};
