//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import {
  createGapSeparator,
  createMenuAction,
  type MenuActionHandler,
  MenuProvider,
  ToolbarMenu,
  useMenuActions,
} from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';

import { JsonEditor } from './JsonEditor';
import { themeEditorId } from '../defs';
import { THEME_EDITOR_PLUGIN } from '../meta';
import { render, reset } from '../util';

const toolbarCreator = () => {
  const renderAction = createMenuAction('render', {
    label: ['render label', { ns: THEME_EDITOR_PLUGIN }],
    icon: 'ph--play--regular',
  });
  const formatAction = createMenuAction('format', {
    label: ['format label', { ns: THEME_EDITOR_PLUGIN }],
    icon: 'ph--magic-wand--regular',
  });
  const gap = createGapSeparator();
  const resetAction = createMenuAction('reset', {
    label: ['reset label', { ns: THEME_EDITOR_PLUGIN }],
    icon: 'ph--broom--regular',
    className: 'text-danger',
  });
  return {
    nodes: [formatAction, renderAction, ...gap.nodes, resetAction],
    edges: [
      { source: 'root', target: 'render' },
      { source: 'root', target: 'format' },
      ...gap.edges,
      { source: 'root', target: 'reset' },
    ],
  };
};

export const ThemeEditor = () => {
  const [key, setKey] = useState(0);
  const handleAction = useCallback<MenuActionHandler>(({ id }) => {
    switch (id) {
      case 'render':
        render();
        break;
      case 'reset':
        reset();
        break;
    }
    setKey(key + 1);
  }, []);
  const menu = useMenuActions(toolbarCreator);
  return (
    <StackItem.Content toolbar>
      <MenuProvider {...menu} onAction={handleAction} attendableId={themeEditorId}>
        <ToolbarMenu />
      </MenuProvider>
      <JsonEditor key={`${themeEditorId}/${key}`} />
    </StackItem.Content>
  );
};
