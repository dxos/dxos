//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { type RefCallback, useState } from 'react';

/**
 * Hook for accessing the editor view.
 *
 * ```tsx
 * const Test = () => {
 *   const [editorRef, editorView] = useEditorView();
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
