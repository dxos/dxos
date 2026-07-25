//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Cursor, isRangeVisible, scrollCommentIntoView } from '@dxos/ui-editor';

import { MarkdownCapabilities, MarkdownOperation } from '../types';

const SCROLL_OPTIONS = { y: 'start', yMargin: 96 } as const;

const handler: Operation.WithHandler<typeof MarkdownOperation.ScrollToAnchor> = MarkdownOperation.ScrollToAnchor.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, cursor, id }) {
      const editorViews = yield* Capability.get(MarkdownCapabilities.EditorViews);
      const entry = editorViews.get(subject);
      if (!entry) {
        return;
      }

      // When a thread ref is supplied, delegate to the shared editor helper which
      // scrolls (only if not already visible) and marks the comment current.
      if (id) {
        scrollCommentIntoView(entry.view, id, SCROLL_OPTIONS);
        return;
      }

      // Fallback: no thread ref — scroll the cursor range into view if needed.
      const range = Cursor.getRangeFromCursor(entry.view.state, cursor);
      if (!range) {
        return;
      }
      // Selecting the range is what makes the reveal visible for an anchor that carries no decoration
      // of its own (a suggestion card's change), so the reader sees which one they picked.
      entry.view.dispatch({
        ...(range.to > range.from ? { selection: { anchor: range.from, head: range.to } } : {}),
        ...(isRangeVisible(entry.view, range)
          ? {}
          : { effects: EditorView.scrollIntoView(range.from, SCROLL_OPTIONS) }),
      });
    }),
  ),
);

export default handler;
