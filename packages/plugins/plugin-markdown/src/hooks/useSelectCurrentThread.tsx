//
// Copyright 2024 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { useMemo } from 'react';

import { createResolver, LayoutAction, useIntentResolver } from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { Cursor, setSelection } from '@dxos/react-ui-editor';

import { MARKDOWN_PLUGIN } from '../meta';

/**
 * Handle scrolling and selection of the current thread in a markdown editor.
 */
export const useSelectCurrentThread = (editorView: EditorView | undefined, documentId: string) => {
  const scrollIntoViewResolver = useMemo(
    () =>
      createResolver({
        intent: LayoutAction.UpdateLayout,
        disposition: 'hoist',
        filter: (data): data is { part: 'current'; subject: string; options: { cursor: string } } => {
          if (!S.is(LayoutAction.ScrollIntoView.fields.input)(data)) {
            return false;
          }

          return !!editorView && data.subject === documentId && !!data.options?.cursor;
        },
        resolve: ({ options: { cursor } }) => {
          invariant(editorView, 'Editor view is not defined.');
          const range = Cursor.getRangeFromCursor(editorView.state, cursor!);
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
        },
      }),
    [documentId, editorView],
  );

  useIntentResolver(MARKDOWN_PLUGIN, scrollIntoViewResolver);
};
