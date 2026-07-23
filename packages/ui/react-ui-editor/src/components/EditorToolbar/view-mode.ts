//
// Copyright 2025 DXOS.org
//

import { type ActionGroupBuilderFn, type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';
import { type EditorViewMode } from '@dxos/ui-editor/types';
import { type Label } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { type EditorToolbarState } from './types';

/**
 * One entry in the editor's view-mode dropdown. A built-in entry references an {@link EditorViewMode}
 * by `id` and relies on the defaults (label `view-mode.<id>.label`, checked when it is the active view
 * mode, select via `onViewModeChange`). A contributed entry (e.g. a review "Suggesting" mode) supplies
 * its own `label`, `checked`, and `onSelect` so it can drive state other than the editor view mode.
 */
export type ViewModeItem = {
  id: string;
  icon: string;
  label?: Label;
  checked?: boolean;
  onSelect?: () => void;
};

/** The built-in view modes: preview (rendered), source (raw edit), readonly (non-editable source). */
export const defaultViewModeItems: ViewModeItem[] = [
  { id: 'preview', icon: 'ph--eye--regular' },
  { id: 'source', icon: 'ph--pencil-simple--regular' },
  { id: 'readonly', icon: 'ph--pencil-slash--regular' },
];

/**
 * Add view mode actions to the builder. `items` defaults to the three built-in editor view modes;
 * callers pass an extended list to surface contributed modes (see {@link ViewModeItem}) in the same
 * single-select dropdown. The trigger tracks the checked item (via the group's `applyActive`).
 */
export const addViewMode =
  (
    state: EditorToolbarState,
    onViewModeChange: (mode: EditorViewMode) => void,
    items: ViewModeItem[] = defaultViewModeItems,
  ): ActionGroupBuilderFn =>
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
        for (const item of items) {
          // A contributed entry may drive non-view-mode state, so honour its explicit `checked`;
          // a built-in entry is checked when it matches the active editor view mode.
          const checked = item.checked ?? item.id === value;
          group.action(
            `view-mode--${item.id}`,
            {
              label: item.label ?? [`view-mode.${item.id}.label`, { ns: translationKey }],
              checked,
              icon: item.icon,
            },
            () => (item.onSelect ? item.onSelect() : onViewModeChange(item.id as EditorViewMode)),
          );
        }
      },
    );
  };
