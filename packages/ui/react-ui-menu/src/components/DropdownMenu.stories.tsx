//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { type NodeArg } from '@dxos/app-graph';
import { faker } from '@dxos/random';
import { IconButton } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { DropdownMenu as NaturalDropdownMenu } from './DropdownMenu';
import translations from '../translations';

faker.seed(1234);

export default {
  title: 'ui/react-ui-menu/DropdownMenu',
  component: NaturalDropdownMenu.Root,
  decorators: [withTheme],
  parameters: { translations },
};

const menuActions = faker.helpers.multiple(
  () =>
    ({
      id: faker.string.uuid(),
      type: 'action',
      data: () => {
        console.log('invoke');
      },
      properties: {
        label: faker.lorem.words(2),
        icon: 'ph--circle--regular',
      },
    }) satisfies NodeArg<any>,
  { count: 20 },
);

export const DropdownMenu = {
  render: () => {
    return (
      <NaturalDropdownMenu.Root actions={menuActions} onAction={(action) => console.log('[on action]', action)}>
        <NaturalDropdownMenu.Trigger asChild>
          <IconButton icon='ph--list-checks--regular' label='Options' />
        </NaturalDropdownMenu.Trigger>
      </NaturalDropdownMenu.Root>
    );
  },
};
