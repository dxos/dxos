//
// Copyright 2024 DXOS.org
//

import type { Extension } from '@codemirror/state';
import { dropCursor, EditorView } from '@codemirror/view';

export type DNDOptions = { onDrop?: (view: EditorView, event: { pos: number; files: FileList }) => void };

export const dnd = (options: DNDOptions = {}): Extension => {
  return [
    dropCursor(),
    EditorView.domEventHandlers({
      drop: (event, view) => {
        event.preventDefault();
        const files = event.dataTransfer?.files;
        const pos = view.posAtCoords(event);
        if (files?.length && pos !== null) {
          options.onDrop?.(view, { files, pos });
        }
      },
    }),
  ];
};
