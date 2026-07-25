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

      // A change proposed at a single offset (a pure insertion) anchors as a zero-width range, which
      // resolves only if both ends map; fall back to the start alone so those still reveal.
      const [from] = cursor.split(':');
      const range =
        Cursor.getRangeFromCursor(entry.view.state, cursor) ??
        Cursor.getRangeFromCursor(entry.view.state, `${from}:${from}`);
      if (!range) {
        return;
      }

      // Put the caret where the reader can type against the change, and take focus. A change proposed
      // as its own line (a zero-width anchor at a line start) reads better from the line before it —
      // parking inside the proposal's own line puts the caret after the text it proposes.
      const line = entry.view.state.doc.lineAt(range.from);
      const anchor =
        range.to === range.from && range.from === line.from && line.number > 1
          ? entry.view.state.doc.line(line.number - 1).to
          : range.from;
      entry.view.dispatch({
        selection: { anchor },
        ...(isRangeVisible(entry.view, range)
          ? {}
          : { effects: EditorView.scrollIntoView(range.from, SCROLL_OPTIONS) }),
      });
      entry.view.focus();
    }),
  ),
);

export default handler;
