//
// Copyright 2026 DXOS.org
//

import { type ActionGraphProps, createMenuAction } from '@dxos/react-ui-menu';

import { meta } from '../../meta';

export type EditorActions = {
  onAddObject: () => void;
  onDeleteSelected: () => void;
};

/** Creates standalone action buttons for the toolbar. */
export const createEditorActions = (actions: EditorActions): ActionGraphProps => {
  return {
    nodes: [
      createMenuAction('add-object', actions.onAddObject, {
        label: ['action.add-object.label', { ns: meta.id }],
        icon: 'ph--plus--regular',
      }),
      createMenuAction('delete-object', actions.onDeleteSelected, {
        label: ['action.delete-object.label', { ns: meta.id }],
        icon: 'ph--trash--regular',
      }),
    ],
    edges: [
      { source: 'root', target: 'add-object', relation: 'child' },
      { source: 'root', target: 'delete-object', relation: 'child' },
    ],
  };
};
