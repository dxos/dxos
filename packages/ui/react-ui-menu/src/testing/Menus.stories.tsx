//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';
import React, { useCallback } from 'react';

import { faker } from '@dxos/random';
import { IconButton } from '@dxos/react-ui';
import { withLayout, withSignals, withTheme } from '@dxos/storybook-utils';

import { createActions, createNestedActions, createNestedActionsResolver, useMutateActions } from './index';
import { DropdownMenu as NaturalDropdownMenu, ToolbarMenu, MenuProvider } from '../components';
import { type MenuAction, type MenuActionHandler } from '../defs';
import { useMenuActions } from '../hooks';
import translations from '../translations';

faker.seed(1234);

export default {
  title: 'ui/react-ui-menu/Menus',
  component: ToolbarMenu,
  decorators: [withTheme, withLayout({ tooltips: true }), withSignals],
  parameters: { translations },
};

const menuActions = createActions() as MenuAction[];
const nestedMenuActions = createNestedActionsResolver();

const handleAction = (action: MenuAction) => console.log('[on action]', action);

export const DropdownMenu = {
  render: () => {
    useMutateActions(menuActions);
    const resolveGroupItems = useCallback(() => menuActions, []);
    return (
      <MenuProvider resolveGroupItems={resolveGroupItems} onAction={handleAction as MenuActionHandler}>
        <NaturalDropdownMenu.Root>
          <NaturalDropdownMenu.Trigger asChild>
            <IconButton icon='ph--list-checks--regular' size={5} label='Options' />
          </NaturalDropdownMenu.Trigger>
        </NaturalDropdownMenu.Root>
      </MenuProvider>
    );
  },
};

export const Toolbar = {
  render: () => {
    return (
      <MenuProvider onAction={handleAction as MenuActionHandler} {...nestedMenuActions}>
        <ToolbarMenu />
      </MenuProvider>
    );
  },
};

export const UseMenuActionsToolbar = {
  render: () => {
    const menu = useMenuActions(createNestedActions);
    return (
      <MenuProvider onAction={handleAction as MenuActionHandler} {...menu}>
        <ToolbarMenu />
      </MenuProvider>
    );
  },
};
