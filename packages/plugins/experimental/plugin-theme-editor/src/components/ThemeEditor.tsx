//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import {
  createMenuAction,
  type MenuActionHandler,
  MenuProvider,
  ToolbarMenu,
  useMenuActions,
} from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';

import { THEME_EDITOR_PLUGIN } from '../meta';

const toolbarCreator = () => {
  const formatAction = createMenuAction('format', {
    label: ['format label', { ns: THEME_EDITOR_PLUGIN }],
    icon: 'ph--magic-wand--regular',
  });
  const runAction = createMenuAction('run', {
    label: ['run label', { ns: THEME_EDITOR_PLUGIN }],
    icon: 'ph--play--regular',
  });
  return {
    nodes: [formatAction, runAction],
    edges: [
      { source: 'root', target: 'run' },
      { source: 'root', target: 'format' },
    ],
  };
};

export const ThemeEditor = () => {
  const handleAction = useCallback<MenuActionHandler>((action) => {
    console.log(action);
  }, []);
  const menu = useMenuActions(toolbarCreator);
  return (
    <StackItem.Content toolbar>
      <MenuProvider {...menu} onAction={handleAction} attendableId={`${THEME_EDITOR_PLUGIN}/theme-editor`}>
        <ToolbarMenu />
      </MenuProvider>
      <div>Theme editor</div>
    </StackItem.Content>
  );
};
