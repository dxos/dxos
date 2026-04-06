//
// Copyright 2026 DXOS.org
//

import { type ActionGroupBuilderFn, type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';

import { meta } from '#meta';

export type ViewState = {
  showGrid: boolean;
  showDebug: boolean;
};

/** Creates the view options toggle group. */
export const createViewActions =
  (state: ViewState, onViewChange: (next: Partial<ViewState>) => void): ActionGroupBuilderFn =>
  (builder) => {
    builder.group(
      'view',
      {
        label: ['view.label', { ns: meta.id }],
        iconOnly: true,
        variant: 'toggleGroup',
        selectCardinality: 'multiple',
        value: Object.entries(state)
          .filter(([key, value]) => key !== 'selectionMode' && value === true)
          .map(([key]) => key),
      } as ToolbarMenuActionGroupProperties,
      (group) => {
        group.action(
          'showGrid',
          { label: ['view.grid.label', { ns: meta.id }], checked: state.showGrid, icon: 'ph--grid-four--regular' },
          () => onViewChange({ showGrid: !state.showGrid }),
        );
        group.action(
          'showDebug',
          { label: ['view.debug.label', { ns: meta.id }], checked: state.showDebug, icon: 'ph--bug--regular' },
          () => onViewChange({ showDebug: !state.showDebug }),
        );
      },
    );
  };
