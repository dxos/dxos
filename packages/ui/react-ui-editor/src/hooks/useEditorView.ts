//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { type MutableRefObject, useRef, useState } from 'react';

/**
 * Hook for accessing the editor view.
 * @deprecated
 *
 * ```tsx
 * const Test = () => {
 *   const [editorRef, viewInvalidated] = useEditorView();
 *   useEffect(() => {
 *     if (editorRef.current && !viewInvalidated) {
 *       editorView?.focus();
 *     }
 *   }, [editorView]);
 *   return <TextEditor ref={editorRef} />;
 * };
 * ```
 */
export const useEditorView = (id: string): [MutableRefObject<EditorView | null>, boolean] => {
  const editorRef = useRef<EditorView | null>(null);
  const [prev, setPrev] = useState<[EditorView | null, string]>([null, '']);
  if (prev[0] !== editorRef.current) {
    setPrev([editorRef.current, id]);
  }

  return [editorRef, prev[1] !== id];
};
