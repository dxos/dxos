//
// Copyright 2022 DXOS.org
//

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection } from 'lexical';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { INSERT_FRAME_COMMAND } from '../FramePlugin';

// TODO(burdon): Config from map.
const isInsertFrame = (event: KeyboardEvent) => {
  const { key, metaKey } = event;
  return metaKey && key === 'i';
};

const Menu = () => {
  const [editor] = useLexicalComposerContext();
  const divRef = useRef<HTMLDivElement | null>(null);

  // Keyboard event handlers.
  useEffect(() => {
    const root = editor.getRootElement();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInsertFrame(event)) {
        editor.dispatchCommand(INSERT_FRAME_COMMAND, undefined);
      }
    };

    root?.addEventListener('keydown', handleKeyDown);
    return () => {
      root?.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor]);

  // TODO(burdon): Show menu in sidebar.
  // TODO(burdon): Fix scrollling.
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        // See FloatingCharacterStylesEditor
        const selection = $getSelection();
        const rootElement = editor.getRootElement();
        const nativeSelection = window.getSelection()!;

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
              inner = inner.firstElementChild as any;
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

  return <div ref={divRef}>MENU</div>;
};

/**
 * Context menu popup.
 */
export const MenuPlugin = () => {
  return createPortal(<Menu />, document.body);
};
