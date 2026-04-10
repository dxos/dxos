//
// Copyright 2025 DXOS.org
//

import { type ActionGroupBuilderFn, type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';
import { type EditorViewMode } from '@dxos/ui-editor';

import { translationKey } from '../../translations';
import { type EditorToolbarState } from './useEditorToolbar';

const viewModes = {
  preview: 'ph--eye--regular',
  source: 'ph--pencil-simple--regular',
  readonly: 'ph--pencil-slash--regular',
};

/** Add view mode actions to the builder. */
export const addViewMode =
  (state: EditorToolbarState, onViewModeChange: (mode: EditorViewMode) => void): ActionGroupBuilderFn =>
  (builder) => {
    const value = state.viewMode ?? 'source';
    builder.group(
      'viewMode',
      {
        label: ['view-mode.label', { ns: translationKey }],
        icon: 'ph--eye--regular',
        iconOnly: true,
        variant: 'dropdownMenu',
        applyActive: true,
        selectCardinality: 'single',
        value,
      } as ToolbarMenuActionGroupProperties,
      (group) => {
        for (const [viewMode, icon] of Object.entries(viewModes)) {
          const checked = viewMode === value;
          group.action(
            `view-mode--${viewMode}`,
            {
              label: [`view-mode.${viewMode}.label`, { ns: translationKey }],
              checked,
              icon,
            },
            () => onViewModeChange(viewMode as EditorViewMode),
          );
        }
      },
    );
  };
