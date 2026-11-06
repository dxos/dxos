//
// Copyright 2026 DXOS.org
//

import {
  type Fragment,
  type LayoutIntent,
  type Scene,
  copyElements,
  findLayout,
  pasteIntent,
  placesCycle,
} from '@dxos/scene';

import { type ClipboardCodec } from './config.ts';

/** What was copied in this session: the fragment, the `.dx` text written for it, and how often it has been pasted. */
export type SceneClipboard = { fragment: Fragment; text: string; pasted: number };

/**
 * What the next paste pastes: the copy again, a step further, when the system clipboard still holds its text (or
 * none); otherwise the system clipboard's scene text, read into `dim`, as a fresh copy. Undefined when neither holds one.
 */
export const nextPaste = (
  copied: SceneClipboard | undefined,
  text: string | undefined,
  dim: Scene.Dimension,
  codec: Pick<ClipboardCodec, 'read'>,
): SceneClipboard | undefined => {
  if (text !== undefined && text !== copied?.text) {
    const fragment = codec.read(text, dim);
    if (fragment) {
      return { fragment, text, pasted: 1 };
    }
  }
  if (!copied) {
    return undefined;
  }
  // A copy made in the other dimension pastes through its text, lifted or flattened into this one.
  const fragment = copied.fragment.dim === dim ? copied.fragment : codec.read(copied.text, dim);
  return fragment && { ...copied, fragment, pasted: copied.pasted + 1 };
};

/** The session's clipboard, shared by every editor, so a copy in one canvas pastes into another. */
let sessionClipboard: SceneClipboard | undefined;

export const getSessionClipboard = (): SceneClipboard | undefined => sessionClipboard;

export const setSessionClipboard = (next: SceneClipboard | undefined): void => {
  sessionClipboard = next;
};

/** The selection of `layout` as a copy: the fragment and its `.dx` text; undefined when nothing is selected. */
export const copyFragment = (
  codec: Pick<ClipboardCodec, 'write'>,
  document: Scene.SceneDocument,
  layout: string,
  selection: readonly string[],
): SceneClipboard | undefined => {
  const record = findLayout(document, layout);
  if (!record || selection.length === 0) {
    return undefined;
  }
  const fragment = copyElements(record, selection);
  return { fragment, text: codec.write(document, record, fragment), pasted: 0 };
};

/** A paste: the clipboard after it, the intent that lands it and the new elements' ids; or why it cannot land. */
export type PasteResult =
  | { kind: 'paste'; clipboard: SceneClipboard; intent: LayoutIntent; ids: string[] }
  | { kind: 'refused' }
  | { kind: 'empty' };

/**
 * Pastes the next copy into `layout`, offset by the dimension's paste step, with fresh ids; refused when an element
 * would place an object inside its own parts.
 */
export const pasteInto = ({
  codec,
  document,
  layout,
  copied,
  text,
  offset,
}: {
  codec: Pick<ClipboardCodec, 'read'>;
  document: Scene.SceneDocument;
  layout: string;
  copied: SceneClipboard | undefined;
  text: string | undefined;
  offset: (pasted: number) => { x: number; y: number; z?: number };
}): PasteResult => {
  const record = findLayout(document, layout);
  const next = record && nextPaste(copied, text, record.dim, codec);
  if (!record || !next) {
    return { kind: 'empty' };
  }
  const taken = new Set(Object.keys(record.elements));
  const paste = pasteIntent(record, next.fragment, {
    offset: offset(next.pasted),
    newId: (prefix) => {
      let index = 1;
      while (taken.has(`${prefix}-${index}`)) {
        index++;
      }
      taken.add(`${prefix}-${index}`);
      return `${prefix}-${index}`;
    },
    refuses: (object) => placesCycle(document, layout, object),
  });
  return paste ? { kind: 'paste', clipboard: next, ...paste } : { kind: 'refused' };
};
