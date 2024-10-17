//
// Copyright 2024 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { useCallback } from 'react';

import { LayoutAction, useIntentResolver } from '@dxos/app-framework';
import { Cursor, setSelection } from '@dxos/react-ui-editor';

import { MARKDOWN_PLUGIN } from '../meta';

/**
 * Handle scrolling and selection of the current thread in a markdown editor.
 */
export const useSelectCurrentThread = (editorView: EditorView | undefined, documentId: string) => {
  const handleScrollIntoView = useCallback(
    ({ action, data }: { action: string; data?: any }) => {
      if (action === LayoutAction.SCROLL_INTO_VIEW) {
        if (editorView && data?.id === documentId && data?.cursor) {
          // TODO(burdon): We need typed intents.
          const range = Cursor.getRangeFromCursor(editorView.state, data.cursor);
          if (range) {
            const selection = editorView.state.selection.main.from !== range.from ? { anchor: range.from } : undefined;
            const effects = [
              // NOTE: This does not use the DOM scrollIntoView function.
              EditorView.scrollIntoView(range.from, { y: 'start', yMargin: 96 }),
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
        }
      }
    },
    [documentId, editorView],
  );

  useIntentResolver(MARKDOWN_PLUGIN, handleScrollIntoView);
};
