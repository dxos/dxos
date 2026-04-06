//
// Copyright 2026 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useContext, useMemo } from 'react';

import { ElevationProvider } from '@dxos/react-ui';
import { type ActionGraphProps, Menu, MenuBuilder, MenuRootProps, useMenuActions } from '@dxos/react-ui-menu';
import { HuePicker } from '@dxos/react-ui-pickers';
import { composable, composableProps } from '@dxos/ui-theme';

import { type EditorState, getSelectedObjectIds } from '../../tools';
import { type EditorActions, createEditorActions, createTemplateSelector } from './actions';
import { type SelectionMode, createSelectionModeActions } from './selection';
import { createToolActions } from './tools';
import { createViewActions } from './view';

export type SpacetimeToolbarProps = Pick<MenuRootProps, 'attendableId' | 'alwaysActive'> & {
  editorStateAtom: Atom.Writable<EditorState>;
  editorActions: EditorActions;
};

export const SpacetimeToolbar = composable<HTMLDivElement, SpacetimeToolbarProps>(
  ({ attendableId, alwaysActive, editorStateAtom, editorActions, ...props }, forwardedRef) => {
    const registry = useContext(RegistryContext);
    const editorState = useAtomValue(editorStateAtom);
    const selectedObjectIds = getSelectedObjectIds(editorState.selection);

    const updateEditorState = useCallback(
      (next: Partial<EditorState>) => {
        registry.set(editorStateAtom, { ...registry.get(editorStateAtom), ...next });
      },
      [registry, editorStateAtom],
    );

    const menuCreator = useMemo(
      () => createToolbarActions(editorState, editorActions, selectedObjectIds.length, updateEditorState),
      [editorState, editorActions, selectedObjectIds.length, updateEditorState],
    );
    const menuActions = useMenuActions(menuCreator);

    return (
      <ElevationProvider elevation='base'>
        <Menu.Root attendableId={attendableId} alwaysActive={alwaysActive} {...menuActions}>
          <Menu.Toolbar {...composableProps(props)} ref={forwardedRef}>
            {/* TODO(burdon): Extend builder to support custom components. */}
            <HuePicker value={editorState.hue} onChange={(hue) => updateEditorState({ hue })} />
          </Menu.Toolbar>
        </Menu.Root>
      </ElevationProvider>
    );
  },
);

const createToolbarActions = (
  editorState: EditorState,
  editorActions: EditorActions,
  selectionCount: number,
  update: (next: Partial<EditorState>) => void,
): Atom.Atom<ActionGraphProps> => {
  return Atom.make(() =>
    MenuBuilder.make()
      .subgraph(
        createSelectionModeActions(editorState.selectionMode as SelectionMode, (mode) =>
          update({ selectionMode: mode }),
        ),
      )
      .separator('line')
      .subgraph(createToolActions(editorState.tool, (tool) => update({ tool })))
      .separator('line')
      .subgraph(
        createTemplateSelector(editorState.selectedTemplate, (template) => update({ selectedTemplate: template })),
      )
      .separator('line')
      .subgraph(createEditorActions(editorActions, selectionCount))
      .separator()
      .subgraph(createViewActions(editorState, update))
      .build(),
  );
};
