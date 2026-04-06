//
// Copyright 2026 DXOS.org
//

import { type ActionGroupBuilderFn, type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';

import { meta } from '../../meta';
import { type SelectionMode, type SelectionState } from '../../tools/tool-context';

export type { SelectionMode, SelectionState };

const selectionModes: Record<SelectionMode, string> = {
  object: 'ph--cube--regular',
  face: 'ph--rectangle--regular',
};

/** Creates the selection mode toggle group. */
export const createSelectionModeActions =
  (state: SelectionState, onViewChange: (next: Partial<SelectionState>) => void): ActionGroupBuilderFn =>
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
