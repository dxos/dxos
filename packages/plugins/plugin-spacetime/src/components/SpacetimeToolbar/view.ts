//
// Copyright 2026 DXOS.org
//

import { type ActionGroupBuilderFn, type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';

import { meta } from '../../meta';

export type SelectionMode = 'object' | 'face';

export type ViewState = {
  selectionMode: SelectionMode;
  showGrid: boolean;
  showDebug: boolean;
};

const selectionModes: Record<SelectionMode, string> = {
  object: 'ph--cube--regular',
  face: 'ph--rectangle--regular',
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

/** Creates the selection mode toggle group. */
export const createSelectionModeActions =
  (state: ViewState, onViewChange: (next: Partial<ViewState>) => void): ActionGroupBuilderFn =>
  (builder) => {
    builder.group(
      'selection-mode',
      {
        label: ['selection-mode.label', { ns: meta.id }],
        iconOnly: true,
        variant: 'toggleGroup',
        selectCardinality: 'single',
        value: state.selectionMode,
      } as ToolbarMenuActionGroupProperties,
      (group) => {
        for (const [mode, icon] of Object.entries(selectionModes)) {
          group.action(
            mode,
            { label: [`selection-mode.${mode}.label`, { ns: meta.id }], checked: state.selectionMode === mode, icon },
            () => onViewChange({ selectionMode: mode as SelectionMode }),
          );
        }
      },
    );
  };
