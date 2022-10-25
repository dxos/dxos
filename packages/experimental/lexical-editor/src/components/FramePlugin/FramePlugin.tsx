//
// Copyright 2022 DXOS.org
//

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  COMMAND_PRIORITY_LOW,
  createCommand,
  LexicalCommand,
  LexicalEditor
} from 'lexical';
import { useEffect } from 'react';

export const INSERT_FRAME_COMMAND: LexicalCommand<void> = createCommand();

const useFrame = (editor: LexicalEditor) => {
  useEffect(() => {
    // https://lexical.dev/docs/concepts/commands
    editor.registerCommand(
      INSERT_FRAME_COMMAND,
      () => {
        editor.update(() => {
          // TODO(burdon): Insert ElementNode.
          const selection = $getSelection();
          console.log(selection);
          // const nodes = selection.getNodes();
          // const anchor = selection.anchor;
          // const anchorNode = anchor.getNode();
        });

        return true;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor]);

  return null;
};

/**
 * Embedded frames.
 */
export const FramePlugin = () => {
  const [editor] = useLexicalComposerContext();
  useFrame(editor);

  return null;
};
