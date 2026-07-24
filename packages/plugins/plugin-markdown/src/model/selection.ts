//
// Copyright 2026 DXOS.org
//

import { getTextInAnchorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { Selection } from '@dxos/react-ui-attention';

import { type Markdown } from '#types';

export type SelectionRange = {
  anchor: string;
  text: string;
};

/** Resolve an anchor against the document's loaded text content; `undefined` while the ref is unloaded. */
export const getMarkdownAnchorText = (doc: Markdown.Document, anchor: string): string | undefined => {
  const target = doc.content?.target;
  if (!target) {
    return undefined;
  }
  return getTextInAnchorRange(Doc.createAccessor(target, ['content']), anchor);
};

/** Resolve a selection to `{ anchor, text }` ranges; a range that fails to resolve is dropped. */
export const getSelectionRanges = (
  doc: Markdown.Document,
  selection: Selection.Selection | undefined,
): SelectionRange[] =>
  Selection.toAnchors(selection).flatMap((anchor) => {
    // A stale cursor throws in Automerge; a bad range must not fail the whole selection.
    try {
      const text = getMarkdownAnchorText(doc, anchor);
      return text != null && text.length > 0 ? [{ anchor, text }] : [];
    } catch {
      return [];
    }
  });
