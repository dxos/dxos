//
// Copyright 2024 DXOS.org
//

import type { Extension } from '@codemirror/state';
import { dropCursor, EditorView } from '@codemirror/view';

import { getToken } from '../styles';

export type DNDOptions = { onDrop?: (view: EditorView, event: { files: FileList }) => void };

const styles = EditorView.baseTheme({
  '.cm-dropCursor': {
    borderLeft: `2px solid ${getToken('extend.colors.primary.500')}`,
    color: getToken('extend.colors.primary.500'),
    padding: '0 4px',
  },
  '.cm-dropCursor:after': {
    content: '"←"',
  },
});

export const dropFile = (options: DNDOptions = {}): Extension => {
  return [
    styles,
    dropCursor(),
    EditorView.domEventHandlers({
      drop: (event, view) => {
        event.preventDefault();
        const files = event.dataTransfer?.files;
        const pos = view.posAtCoords(event);
        if (files?.length && pos !== null) {
          view.dispatch({ selection: { anchor: pos } });
          options.onDrop?.(view, { files });
        }
      },
    }),
  ];
};
