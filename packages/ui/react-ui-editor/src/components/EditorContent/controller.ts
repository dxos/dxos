//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

export interface EditorController {
  get view(): EditorView | null;
  getText: () => string;
  setText: (text: string, focus?: boolean) => void;
  focus: () => void;
}

export const noopController: EditorController = {
  get view() {
    return null;
  },
  getText: () => '',
  setText: () => {},
  focus: () => {},
};

export const createEditorController = (view: EditorView | null): EditorController => {
  return {
    get view() {
      return view;
    },
    getText: () => {
      return view?.state.doc.toString() ?? '';
    },
    setText: (text: string, focus?: boolean) => {
      view?.dispatch({
        changes: {
          from: 0,
          to: view?.state.doc.length ?? 0,
          insert: text,
        },
        selection: {
          anchor: text.length,
          head: text.length,
        },
      });

      if (focus) {
        view?.focus();
      }
    },
    focus: () => view?.focus(),
  };
};
