//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';
import React, { useCallback } from 'react';

import { ACTION_GROUP_TYPE, actionGroupSymbol } from '@dxos/app-graph';
import { faker } from '@dxos/random';
import { IconButton } from '@dxos/react-ui';
import { withLayout, withSignals, withTheme } from '@dxos/storybook-utils';

import { createActions, createNestedActionGraph, useMutateActions } from './index';
import { DropdownMenu as NaturalDropdownMenu, Toolbar as NaturalToolbar } from '../components';
import { MenuProvider } from '../components/MenuContext';
import { type MenuAction, type MenuContextValue, type MenuItemGroup } from '../defs';
import translations from '../translations';

faker.seed(1234);

export default {
  title: 'ui/react-ui-menu/Menus',
  component: NaturalToolbar,
  decorators: [withTheme, withLayout({ tooltips: true }), withSignals],
  parameters: { translations },
};

const menuActions = createActions() as MenuAction[];
const nestedMenuActions = createNestedActionGraph();
const rootGroup = {
  id: 'root',
  type: ACTION_GROUP_TYPE,
  data: actionGroupSymbol,
  properties: {
    icon: 'ph--list-checks--regular',
    label: 'Options',
  },
} satisfies MenuItemGroup;

const handleAction = (action: MenuAction) => console.log('[on action]', action);

export const DropdownMenu = {
  render: () => {
    useMutateActions(menuActions);
    const resolveGroupItems = useCallback(() => menuActions, []);
    return (
      <MenuProvider resolveGroupItems={resolveGroupItems} onAction={handleAction as MenuContextValue['onAction']}>
        <NaturalDropdownMenu.Root group={rootGroup}>
          <NaturalDropdownMenu.Trigger asChild>
            <IconButton icon={rootGroup.properties.icon} size={5} label={rootGroup.properties.label} />
          </NaturalDropdownMenu.Trigger>
        </NaturalDropdownMenu.Root>
      </MenuProvider>
    );
  },
};

export const Toolbar = {
  render: () => {
    return (
      <MenuProvider onAction={handleAction as MenuContextValue['onAction']} {...nestedMenuActions}>
        <NaturalToolbar />
      </MenuProvider>
    );
  },
};
