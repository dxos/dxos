//
// Copyright 2024 DXOS.org
//

import type { Extension } from '@codemirror/state';
import { EditorView, dropCursor } from '@codemirror/view';

export type DropOptions = {
  onDrop?: (view: EditorView, event: { files: FileList }) => void;
};

export const dropFile = (options: DropOptions = {}): Extension => {
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

const styles = EditorView.theme({
  '.cm-dropCursor': {
    borderLeft: '2px solid var(--dx-accentText)',
    color: 'var(--dx-accentText)',
    padding: '0 4px',
  },
  '.cm-dropCursor:after': {
    content: '"←"',
  },
});
