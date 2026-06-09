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

// Hide `view` from own-enumerable traversal. Controllers are passed through React props/context, and the
// live `EditorView` reaches the global `window` via `view.observer.win` (CodeMirror's DOMObserver). React
// 19.2's dev render-logger walks changed props' object graphs and would otherwise descend into `window`,
// enumerate `window[0]` (a cross-origin iframe) and throw SecurityError. Direct access is unaffected.
const withHiddenView = (controller: EditorController): EditorController => {
  Object.defineProperty(controller, 'view', { enumerable: false });
  return controller;
};

export const noopController: EditorController = withHiddenView({
  get view() {
    return null;
  },
  getText: () => '',
  setText: () => {},
  focus: () => {},
});

export const createEditorController = (view: EditorView | null): EditorController => {
  return withHiddenView({
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
  });
};
