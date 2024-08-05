//
// Copyright 2024 DXOS.org
//

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { type LexicalEditor } from 'lexical';
import { type RefObject, useLayoutEffect } from 'react';

export default ({ editorRef }: { editorRef: RefObject<LexicalEditor | null> }) => {
  const [editor] = useLexicalComposerContext();

  useLayoutEffect(() => {
    // @ts-ignore
    editorRef.current = editor;
  });

  return null;
};
