//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads } from '@automerge/automerge';

import * as Draft from '@dxos/automerge-proxy/Draft';
import * as Handle from '@dxos/automerge-proxy/Handle';

//
// The Automerge calls the database layer makes directly, routed to the proxy when the document is
// one. A tab without Automerge would keep only the proxy branch of each.
//

export const isMirrorDoc = (doc: object): boolean => Handle.isProxyDoc(doc);

/** Heads of a document; for a mirror these are the last confirmed ones and lag unconfirmed edits. */
export const getHeads = (doc: object): Heads => Handle.getHeads(doc) ?? A.getHeads(doc);

/** Whether the document has seen every change in `heads`; a mirror only knows its own frontier. */
export const hasHeads = (doc: object, heads: Heads): boolean => {
  const current = Handle.getHeads(doc);
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
