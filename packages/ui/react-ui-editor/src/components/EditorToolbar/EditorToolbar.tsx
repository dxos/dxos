//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import * as Atom from 'effect/reactivity/Atom';
import React, { type ReactNode, memo, useMemo } from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import {
  type ActionGraphProps,
  ActionMenu,
  ActionToolbar,
  type MenuAction,
  MenuBuilder,
  TOOLBAR_OVERFLOW_ID,
  useMenuActions,
} from '@dxos/react-ui-menu';
import type * as Util from '@dxos/react-ui/Util';
import { type EditorViewMode } from '@dxos/ui-editor/types';

import { translationKey } from '#translations';

import { addBlocks } from './blocks.ts';
import { addFormatting } from './formatting.ts';
import { addHeadings } from './headings.ts';
import { addImageUpload } from './image.ts';
import { addLists } from './lists.ts';
import { addSearch } from './search.ts';
import { type EditorToolbarState } from './types.ts';
import { type ViewModeItem, addViewMode } from './view-mode.ts';

// TODO(burdon): Enable toolbar variants (e.g., markdown, code).

/**
 * The Insert group (lists, blocks, image), which consumers extend with `MenuBuilder.extend` to insert content. It and the
 * Format group show their buttons while the toolbar has room and fold into menus when it does not.
 */
export const EDITOR_TOOLBAR_INSERT_GROUP = 'insert';

// Local copy of AppSurface.Section.role — react-ui-editor cannot depend on app-toolkit without a circular dep.
const SECTION_ROLE = 'org.dxos.role.section';

export type EditorToolbarFeatureFlags = Partial<{
  showHeadings: boolean;
  showFormatting: boolean;
  showLists: boolean;
  showBlocks: boolean;
  showSearch: boolean;

  // TODO(wittjosiah): Factor out (depends on plugin-level capabilities.)
  onImageUpload: () => void;
  onViewModeChange: (mode: EditorViewMode) => void;
  /** Override the view-mode dropdown entries (default: the three built-in modes). See {@link ViewModeItem}. */
  viewModes: ViewModeItem[];
}>;

export type EditorToolbarActionGraphProps = {
  state: Atom.Atom<EditorToolbarState>;
  getView: () => EditorView;
  /** Added to the toolbar's graph; root items follow the editor's own, or extend {@link EDITOR_TOOLBAR_INSERT_GROUP}. */
  customActions?: Atom.Atom<ActionGraphProps>;
};

export type EditorToolbarProps = Util.ThemedClassName<
  {
    role?: string;
    attendableId?: string;
    /** Handler for executing actions. Required when customActions use Operation.invoke. */
    onAction?: (action: MenuAction, params: AppGraphNode.InvokeProps) => void;
  } & (EditorToolbarActionGraphProps & EditorToolbarFeatureFlags)
>;

export const EditorToolbar = memo(({ classNames, role, attendableId, onAction, ...props }: EditorToolbarProps) => {
  const menuActions = useMarkdownMenuActions(props);

  return <ActionToolbar {...menuActions} attendableId={attendableId} onAction={onAction} classNames={classNames} />;
});

export type EditorToolbarMenuProps = Omit<EditorToolbarProps, 'role' | 'attendableId' | 'classNames'> & {
  /** The trigger. */
  children: ReactNode;
};

/** The toolbar's actions as a menu, built from the same graph: groups become submenus, toggles checkable items. */
export const EditorToolbarMenu = memo(({ onAction, children, ...props }: EditorToolbarMenuProps) => {
  const menuActions = useMarkdownMenuActions(props);

  return (
    <ActionMenu {...menuActions} onAction={onAction}>
      {children}
    </ActionMenu>
  );
});

export type EditorToolbarActionsProps = Pick<EditorToolbarActionGraphProps, 'state' | 'getView' | 'customActions'> &
  EditorToolbarFeatureFlags;

// TODO(burdon): Some actions should toggle the state (e.g., toggle bullets on/off depending on the current state).
// TODO(wittjosiah): Toolbar re-rendering is causing this graph to be recreated and breaking reactivity in some cases.
//   E.g. for toolbar dropdowns which use active icon, the icon is not updated when the active item changes.
//   This is currently only happening in the markdown plugin usage and should be reproduced in an editor story.
const useMarkdownMenuActions = ({ state, getView, customActions, ...features }: EditorToolbarActionsProps) => {
  const menuCreator = useMemo(
    () => createEditorToolbarActions({ state, getView, customActions, ...features }),
    [
      state,
      getView,
      customActions,
      features?.showHeadings,
      features?.showFormatting,
      features?.showLists,
      features?.showBlocks,
      features?.showSearch,
      features?.onImageUpload,
      features?.onViewModeChange,
      features?.viewModes,
    ],
  );

  return useMenuActions(menuCreator);
};

/** The toolbar's action graph, for a host that renders the editor's tools in its own toolbar. */
export const createEditorToolbarActions = ({
  state,
  getView,
  customActions,
  ...features
}: EditorToolbarActionsProps): Atom.Atom<ActionGraphProps> => {
  return Atom.make((get) => {
    // Subscribe to state changes.
    const stateSnapshot = get(state);
    // Insert folds and leaves the row before Format, whose marks the document tour points at.
    const builder = MenuBuilder.make()
      .group(
        'format',
        {
          label: ['format.label', { ns: translationKey }],
          icon: 'ph--text-aa--regular',
          iconOnly: false,
          placement: { fold: true },
          testId: 'editor.toolbar.format',
        },
        (group) =>
          group
            .subgraph(features?.showHeadings !== false && addHeadings(stateSnapshot, getView))
            .subgraph(features?.showFormatting !== false && addFormatting(stateSnapshot, getView)),
      )
      .group(
        EDITOR_TOOLBAR_INSERT_GROUP,
        {
          label: ['insert.label', { ns: translationKey }],
          icon: 'ph--plus--regular',
          iconOnly: false,
          placement: { fold: true, collapse: 0 },
          testId: 'editor.toolbar.insert',
        },
        (group) =>
          group
            .subgraph(features?.showLists !== false && addLists(stateSnapshot, getView))
            .subgraph(features?.showBlocks !== false && addBlocks(stateSnapshot, getView))
            .subgraph(features?.onImageUpload && addImageUpload(features.onImageUpload)),
      );

    return builder
      .separator('gap')
      .subgraph(customActions && get(customActions))
      .subgraph(features?.showSearch !== false && addSearch(getView))
      .subgraph(features?.onViewModeChange && addViewMode(stateSnapshot, features.onViewModeChange, features.viewModes))
      .menu(TOOLBAR_OVERFLOW_ID, () => {})
      .build();
  });
};
