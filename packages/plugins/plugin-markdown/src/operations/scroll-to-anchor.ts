//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Cursor, setSelection } from '@dxos/ui-editor';

import { MarkdownCapabilities, MarkdownOperation } from '../types';

/**
 * Whether the [from, to] range is already entirely within the editor's scroll
 * viewport. Returns false if either endpoint isn't currently rendered (off-screen).
 */
const isRangeVisible = (view: EditorView, range: { from: number; to: number }): boolean => {
  const from = view.coordsAtPos(range.from);
  const to = view.coordsAtPos(range.to);
  if (!from || !to) {
    return false;
  }
  const { top, bottom } = view.scrollDOM.getBoundingClientRect();
  return from.top >= top && to.bottom <= bottom;
};

const handler: Operation.WithHandler<typeof MarkdownOperation.ScrollToAnchor> = MarkdownOperation.ScrollToAnchor.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, cursor, ref }) {
      const editorViews = yield* Capability.get(MarkdownCapabilities.EditorViews);
      const entry = editorViews.get(subject);
      if (!entry) {
        return;
      }
      const range = Cursor.getRangeFromCursor(entry.view.state, cursor);
      if (range) {
        const selection = entry.view.state.selection.main.from !== range.from ? { anchor: range.from } : undefined;
        // Only scroll when the anchored range isn't already entirely visible.
        const effects: any[] = isRangeVisible(entry.view, range)
          ? []
          : [EditorView.scrollIntoView(range.from, { y: 'start', yMargin: 96 })];
        if (ref || selection) {
          // Mark the referenced comment (thread) as current so the editor highlights
          // it; fall back to the document id when no ref is supplied. Always update
          // when a `ref` is given so the highlight follows the selected thread even
          // if the caret is already at the anchor start (or two threads share it).
          effects.push(setSelection.of({ current: ref ?? entry.documentId }));
        }
        if (effects.length > 0 || selection) {
          entry.view.dispatch({
            effects,
            selection: selection ? { anchor: range.from } : undefined,
          });
        }
      }
    }),
  ),
);

export default handler;
