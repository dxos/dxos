//
// Copyright 2026 DXOS.org
//

import { type ActionGroupBuilderFn, type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { type EditorState } from '../../tools';

/** Creates the view options toggle group. */
export const createViewActions =
  (
    editorState: Pick<EditorState, 'showGrid' | 'showDebug'>,
    update: (next: Partial<EditorState>) => void,
  ): ActionGroupBuilderFn =>
  (builder) => {
    builder.group(
      'view',
      {
        label: ['view.label', { ns: meta.id }],
        iconOnly: true,
        variant: 'toggleGroup',
        selectCardinality: 'multiple',
        value: Object.entries(editorState)
          .filter(([, value]) => value === true)
          .map(([key]) => key),
      } as ToolbarMenuActionGroupProperties,
      (group) => {
        group.action(
          'showGrid',
          {
            label: ['view.grid.label', { ns: meta.id }],
            checked: editorState.showGrid,
            icon: 'ph--grid-four--regular',
          },
          () => update({ showGrid: !editorState.showGrid }),
        );
        group.action(
          'showDebug',
          { label: ['view.debug.label', { ns: meta.id }], checked: editorState.showDebug, icon: 'ph--bug--regular' },
          () => update({ showDebug: !editorState.showDebug }),
        );
      },
    );
  };
