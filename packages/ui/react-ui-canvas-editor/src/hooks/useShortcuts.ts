//
// Copyright 2024 DXOS.org
//

import { useHotkeys } from '@dxos/react-focus';

import { useEditorContext } from './useEditorContext';

/**
 * Handle keyboard shortcuts.
 *
 * Scoped to the editor's id, which `KeyboardContainer` activates while the editor has attention.
 * `preventDefault` is the store's default, so none of these has to ask for it.
 */
export const useShortcuts = () => {
  const { id, graph, selection, actionHandler } = useEditorContext();

  // TODO(burdon): Linux/windows combos also.
  useHotkeys({
    id: `canvas:${id}`,
    commands: [
      { hotkey: 'meta+z', label: 'Undo', scopes: [id], action: () => void actionHandler?.({ type: 'undo' }) },
      { hotkey: 'shift+meta+z', label: 'Redo', scopes: [id], action: () => void actionHandler?.({ type: 'redo' }) },
      { hotkey: 'meta+x', label: 'Cut', scopes: [id], action: () => void actionHandler?.({ type: 'cut' }) },
      { hotkey: 'meta+c', label: 'Copy', scopes: [id], action: () => void actionHandler?.({ type: 'copy' }) },
      { hotkey: 'meta+v', label: 'Paste', scopes: [id], action: () => void actionHandler?.({ type: 'paste' }) },
      {
        hotkey: 'Backspace',
        label: 'Delete',
        scopes: [id],
        action: () => void actionHandler?.({ type: 'delete', ids: selection.getSelectedIds() }),
      },
      {
        hotkey: 'Delete',
        label: 'Delete',
        scopes: [id],
        action: () => void actionHandler?.({ type: 'delete', ids: selection.getSelectedIds() }),
      },
      {
        hotkey: 'Escape',
        label: 'Clear selection',
        scopes: [id],
        action: () => void actionHandler?.({ type: 'select', ids: [] }),
      },
      { hotkey: 'd', label: 'Debug', scopes: [id], action: () => void actionHandler?.({ type: 'debug' }) },
      {
        hotkey: 'meta+a',
        label: 'Select all',
        scopes: [id],
        action: () =>
          void actionHandler?.({
            type: 'select',
            ids: [...graph.nodes.map((node) => node.id), ...graph.edges.map((edge) => edge.id)],
          }),
      },
      { hotkey: "meta+'", label: 'Toggle grid', scopes: [id], action: () => void actionHandler?.({ type: 'grid' }) },
      { hotkey: 'Home', label: 'Home', scopes: [id], action: () => void actionHandler?.({ type: 'home' }) },
    ],
  });
};
