//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { faker } from '@dxos/random';
import { IconButton } from '@dxos/react-ui';
import { withTheme, withLayout, withSignals } from '@dxos/storybook-utils';

import { createActions, createNestedActionGraph, useMutateActions } from './index';
import { Toolbar as NaturalToolbar, DropdownMenu as NaturalDropdownMenu } from '../components';
import { type MenuAction } from '../defs';
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

const handleAction = (action: MenuAction) => console.log('[on action]', action);

export const DropdownMenu = {
  render: () => {
    useMutateActions(menuActions);
    return (
      <NaturalDropdownMenu.Root actions={menuActions} onAction={handleAction}>
        <NaturalDropdownMenu.Trigger asChild>
          <IconButton icon='ph--list-checks--regular' size={5} label='Options' />
        </NaturalDropdownMenu.Trigger>
      </NaturalDropdownMenu.Root>
    );
  },
};

export const Toolbar = {
  render: () => {
    return (
      <NaturalToolbar
        actions={nestedMenuActions.topLevelActions}
        onAction={handleAction}
        graph={nestedMenuActions.graph}
      />
    );
  },
};
