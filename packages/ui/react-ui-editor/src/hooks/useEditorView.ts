//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { type RefCallback, useState } from 'react';

// TODO(burdon): Replace with hook-style API for TextEditor with context.
//  https://www.codiga.io/blog/implement-codemirror-6-in-react
// type TextEditorContextValue = {};
// const TEXT_EDITOR_NAME = 'TextEditor';
// const [TextEditorProvider, useTextEditorContext] = createContext<TextEditorContextValue>(TEXT_EDITOR_NAME);

/**
 * Hook for accessing the editor view.
 *
 * ```tsx
 * const Test = () => {
 *   const [editorRef, editorView] = useTextEditor();
 *   useEffect(() => {
 *     editorView?.focus();
 *   }, [editorView]);
 *   return <TextEditor ref={editorRef} />;
 * };
 * ```
 */
export const useEditorView = (): [RefCallback<EditorView | null>, EditorView | null] => {
  const [view, setView] = useState<EditorView | null>(null);
  return [
    (ref: EditorView | null) => {
      setView(ref);
    },
    view,
  ];
};
