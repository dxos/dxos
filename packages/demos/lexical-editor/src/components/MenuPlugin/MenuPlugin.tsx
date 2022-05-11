//
// Copyright 2022 DXOS.org
//

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection } from 'lexical';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const Menu = () => {
  const [editor] = useLexicalComposerContext();
  const divRef = useRef<HTMLDivElement | null>(null);

  // TODO(burdon): Show menu in sidebar.
  // TODO(burdon): Fix scrollling.
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        // See FloatingCharacterStylesEditor
        const selection = $getSelection();
        const rootElement = editor.getRootElement();
        const nativeSelection = window.getSelection();

        if (
          selection !== null &&
          rootElement !== null &&
          rootElement.contains(nativeSelection.anchorNode)
        ) {
          // TODO(burdon): Factor out.
          let rect;
          if (nativeSelection.anchorNode === rootElement) {
            let inner = rootElement;
            while (inner.firstElementChild !== null) {
              inner = inner.firstElementChild;
            }
            rect = inner.getBoundingClientRect();
          } else {
            const domRange = nativeSelection.getRangeAt(0);
            rect = domRange.getBoundingClientRect();
          }

          console.log(rect);
        }
      });
    });
  }, []);

  return (
    <div ref={divRef}>MENU</div>
  );
};

/**
 * Context menu popup.
 */
export const MenuPlugin = () => {
  return createPortal(<Menu />, document.body);
};
