//
// Copyright 2024 DXOS.org
//

import { EditorState, type EditorStateConfig, type StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type RefObject, useEffect, useRef, useState } from 'react';

export type UseTextEditorOptions = {
  scrollTo?: StateEffect<any>;
} & EditorStateConfig;

export type UseTextEditor = {
  parentRef: RefObject<HTMLDivElement>;
  view?: EditorView;
};

/**
 * Hook for creating editor.
 */
export const useTextEditor = ({ doc, selection, extensions, scrollTo }: UseTextEditorOptions = {}): UseTextEditor => {
  const [view, setView] = useState<EditorView>();
  const parentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (parentRef.current) {
      const view = new EditorView({
        state: EditorState.create({ doc, selection, extensions }),
        parent: parentRef.current,
        scrollTo,
      });

      setView(view);
    }

    return () => {
      view?.destroy();
    };
  }, [parentRef]);

  useEffect(() => {
    view?.dispatch({ selection });
  }, [selection]);

  useEffect(() => {
    if (scrollTo) {
      view?.dispatch({ effects: [scrollTo] });
    }
  }, [scrollTo]);

  return { parentRef, view };
};
