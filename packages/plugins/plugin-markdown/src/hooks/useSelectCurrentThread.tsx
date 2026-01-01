//
// Copyright 2024 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';
import { useMemo } from 'react';

import { Common, OperationResolver } from '@dxos/app-framework';
import { useOperationResolver } from '@dxos/app-framework/react';
import { invariant } from '@dxos/invariant';
import { Cursor, setSelection } from '@dxos/ui-editor';

import { meta } from '../meta';

/**
 * Handle scrolling and selection of the current thread in a markdown editor.
 */
export const useSelectCurrentThread = (editorView: EditorView | null, documentId: string) => {
  const scrollIntoViewHandler = useMemo(
    () =>
      OperationResolver.make({
        operation: Common.LayoutOperation.ScrollIntoView,
        position: 'hoist',
        filter: (input) => !!editorView && input.subject === documentId && !!input.cursor,
        handler: (input) =>
          Effect.sync(() => {
            invariant(editorView, 'Editor view is not defined.');
            const cursor = input.cursor;
            if (!cursor) {
              return;
            }
            const range = Cursor.getRangeFromCursor(editorView.state, cursor);
            if (range) {
              const selection =
                editorView.state.selection.main.from !== range.from ? { anchor: range.from } : undefined;
              const effects = [
                // NOTE: This does not use the DOM scrollIntoView function.
                EditorView.scrollIntoView(range.from, {
                  y: 'start',
                  yMargin: 96,
                }),
              ];
              if (selection) {
                // Update the editor selection to get bi-directional highlighting.
                effects.push(setSelection.of({ current: documentId }));
              }

              editorView.dispatch({
                effects,
                selection: selection ? { anchor: range.from } : undefined,
              });
            }
          }),
      }),
    [documentId, editorView],
  );

  useOperationResolver(meta.id, scrollIntoViewHandler);
};
