//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Cursor, setSelection } from '@dxos/ui-editor';

import { MarkdownCapabilities, MarkdownOperation } from '../types';

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
        const effects: any[] = [EditorView.scrollIntoView(range.from, { y: 'start', yMargin: 96 })];
        if (selection) {
          // Mark the referenced comment (thread) as current so the editor highlights
          // it; fall back to the document id when no ref is supplied.
          effects.push(setSelection.of({ current: ref ?? entry.documentId }));
        }
        entry.view.dispatch({
          effects,
          selection: selection ? { anchor: range.from } : undefined,
        });
      }
    }),
  ),
);

export default handler;
