//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';
import { Cursor, setSelection } from '@dxos/ui-editor';

import { ScrollToAnchor } from './definitions';

import { MarkdownCapabilities } from '../types';

export default ScrollToAnchor.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, cursor }) {
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
          effects.push(setSelection.of({ current: entry.documentId }));
        }
        entry.view.dispatch({
          effects,
          selection: selection ? { anchor: range.from } : undefined,
        });
      }
    }),
  ),
);
