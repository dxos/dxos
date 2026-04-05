//
// Copyright 2026 DXOS.org
//

import { type ActionGroupBuilderFn, type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';

import { meta } from '../../meta';

export type SelectionMode = 'object' | 'face';

export type ViewState = {
  selectionMode: SelectionMode;
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
