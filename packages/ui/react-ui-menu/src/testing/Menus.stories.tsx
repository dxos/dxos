//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { type Action } from '@dxos/app-graph';
import { faker } from '@dxos/random';
import { IconButton } from '@dxos/react-ui';
import { withTheme, withLayout, withSignals } from '@dxos/storybook-utils';

import { createActions, useMutateActions } from './index';
import { Toolbar as NaturalToolbar, DropdownMenu as NaturalDropdownMenu } from '../components';
import translations from '../translations';

faker.seed(1234);

export default {
  title: 'ui/react-ui-menu/Menus',
  component: NaturalToolbar,
  decorators: [withTheme, withLayout({ tooltips: true }), withSignals],
  parameters: { translations },
};

const menuActions = createActions();

const handleAction = (action: Action) => console.log('[on action]', action);

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
    useMutateActions(menuActions);
    return <NaturalToolbar actions={menuActions} onAction={handleAction} />;
  },
};
