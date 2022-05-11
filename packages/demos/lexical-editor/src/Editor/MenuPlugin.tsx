//
// Copyright 2022 DXOS.org
//

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const Menu = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        // TODO(burdon): Get position of cursor on screen.
        const nativeSelection = window.getSelection()!;
        const domRange = nativeSelection.getRangeAt(0);
        const rootElement = editor.getRootElement();
      });
    });
  }, []);

  return (
    <div>MENU</div>
  );
};

/**
 * MenuPlugin
 */
export const MenuPlugin = () => {
  return createPortal(<Menu />, document.body);
};
