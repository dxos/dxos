//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Cursor, isRangeVisible, scrollThreadIntoView } from '@dxos/ui-editor';

import { MarkdownCapabilities, MarkdownOperation } from '../types';

const SCROLL_OPTIONS = { y: 'start', yMargin: 96 } as const;

const handler: Operation.WithHandler<typeof MarkdownOperation.ScrollToAnchor> = MarkdownOperation.ScrollToAnchor.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, cursor, ref }) {
      const editorViews = yield* Capability.get(MarkdownCapabilities.EditorViews);
      const entry = editorViews.get(subject);
      if (!entry) {
        return;
      }

      // When a thread ref is supplied, delegate to the shared editor helper which
      // scrolls (only if not already visible) and marks the comment current.
      if (ref) {
        scrollThreadIntoView(entry.view, ref, SCROLL_OPTIONS);
        return;
      }

      // Fallback: no thread ref — scroll the cursor range into view if needed.
      const range = Cursor.getRangeFromCursor(entry.view.state, cursor);
      if (range && !isRangeVisible(entry.view, range)) {
        entry.view.dispatch({ effects: EditorView.scrollIntoView(range.from, SCROLL_OPTIONS) });
      }
    }),
  ),
);

export default handler;
