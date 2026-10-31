//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import * as AppNode from '@dxos/app-toolkit/AppNode';
import { useEditorCommands } from '@dxos/react-ui-canvas-editor';

/** The app's edit commands (undo, redo, cut, copy, paste) on the article, from the editor's command table. */
export const CanvasEditCommands = ({ element }: { element: HTMLElement | null }) => {
  const commands = useEditorCommands('CanvasEditCommands');
  useEffect(() => {
    if (!element) {
      return;
    }
    const editCommand = (id: 'undo' | 'redo' | 'cut' | 'copy' | 'paste') => ({
      run: () => commands.get(id)?.run(),
      enabled: () => commands.get(id)?.enabled ?? false,
    });
    return AppNode.registerEditCommands(element, {
      undo: editCommand('undo'),
      redo: editCommand('redo'),
      cut: editCommand('cut'),
      copy: editCommand('copy'),
      paste: editCommand('paste'),
    });
  }, [element, commands]);
  return null;
};
