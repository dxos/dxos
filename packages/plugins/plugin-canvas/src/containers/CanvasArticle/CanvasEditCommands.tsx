//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import * as AppNode from '@dxos/app-toolkit/AppNode';
import { useCanvasDocument, useCanvasEditing, useCanvasSelection, useRegistry } from '@dxos/react-ui-canvas/scene';

const CONSUMER = 'CanvasEditCommands';

export type CanvasEditCommandsProps = {
  /** The element whose right-clicks offer the canvas's commands: the whole article, toolbars included. */
  element: HTMLElement | null;
};

/**
 * Offers the canvas's undo, redo and shape clipboard to the app's context menu. Rendered inside `Canvas.Root`, whose
 * context holds the commands; renders nothing.
 */
export const CanvasEditCommands = ({ element }: CanvasEditCommandsProps) => {
  const registry = useRegistry();
  const { document, readonly } = useCanvasDocument(CONSUMER);
  const { atoms: editingAtoms, commands: editing } = useCanvasEditing(CONSUMER);
  const { atoms: selectionAtoms } = useCanvasSelection(CONSUMER);

  useEffect(() => {
    if (!element) {
      return;
    }

    // Read when the menu opens, so the items reflect the canvas at the right-click.
    const selected = () => registry.get(selectionAtoms.selection).size > 0;
    const history = () => registry.get(document.history);
    return AppNode.registerEditCommands(element, {
      undo: { run: document.undo, enabled: () => !readonly && history().canUndo },
      redo: { run: document.redo, enabled: () => !readonly && history().canRedo },
      cut: { run: editing.cut, enabled: () => !readonly && selected() },
      copy: { run: () => void editing.copy(), enabled: selected },
      paste: {
        run: () => editing.paste(),
        enabled: () => !readonly && registry.get(editingAtoms.clipboard) !== undefined,
      },
    });
  }, [element, registry, document, readonly, editing, editingAtoms, selectionAtoms]);

  return null;
};
