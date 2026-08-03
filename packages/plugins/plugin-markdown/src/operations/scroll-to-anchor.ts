//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';
import { Cursor, isRangeVisible, scrollCommentIntoView } from '@dxos/ui-editor/headless';

import { MarkdownCapabilities, MarkdownOperation } from '../types';

const SCROLL_OPTIONS = { y: 'start', yMargin: 96 } as const;

const handler: Operation.WithHandler<typeof MarkdownOperation.ScrollToAnchor> = MarkdownOperation.ScrollToAnchor.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, cursor, id }) {
      const editorViews = yield* Capability.get(MarkdownCapabilities.EditorViews);
      // Views register under `attendableId ?? documentId`, and callers hold one or the other — a
      // companion knows its context plank's attendable id, the graph knows the object URI. Accept
      // either so a caller holding the id the view did not register under still reaches it.
      const entry = editorViews.get(subject) ?? editorViews.getByDocumentId(subject);
      if (!entry) {
        // Loud, because the failure is otherwise invisible: the comment stays highlighted on whichever
        // thread was current while the app-side selection has already moved on.
        log.warn('no editor view for anchor target', { subject });
        return;
      }

      // When a thread ref is supplied, delegate to the shared editor helper which
      // scrolls (only if not already visible) and marks the comment current.
      if (id) {
        scrollCommentIntoView(entry.view, id, SCROLL_OPTIONS);
        return;
      }

      // A change proposed at a single offset (a pure insertion) anchors as a zero-width range, which
      // resolves only if both ends map; fall back to the start alone so those still reveal.
      const [from] = cursor.split(':');
      const range =
        Cursor.getRangeFromCursor(entry.view.state, cursor) ??
        Cursor.getRangeFromCursor(entry.view.state, `${from}:${from}`);
      if (!range) {
        return;
      }

      // Put the caret at the start of the change and take focus: the reader lands where the change is
      // and can type there, which a selection alone does not give them.
      entry.view.dispatch({
        selection: { anchor: range.from },
        ...(isRangeVisible(entry.view, range)
          ? {}
          : { effects: EditorView.scrollIntoView(range.from, SCROLL_OPTIONS) }),
      });
      entry.view.focus();
    }),
  ),
);

export default handler;
