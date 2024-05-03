//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { List, Circle } from '@phosphor-icons/react';
import { type Meta } from '@storybook/react';
import React from 'react';

import { faker } from '@dxos/random';
import { DensityProvider, Tooltip } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { NavTreeItemAction } from './NavTreeItemAction';

const meta: Meta = {
  title: 'react-ui-navtree/NavTreeItemAction',
  component: NavTreeItemAction,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    withTheme,
    (Story: any) => (
      <Tooltip.Provider>
        <DensityProvider density='fine'>
          <div role='none' className='p-2'>
            <Story />
          </div>
        </DensityProvider>
      </Tooltip.Provider>
    ),
  ],
};

// TODO(burdon): Required otherwise ID complains with `Inferred type...` error.
export default meta;

export const Default = {
  render: () => {
    // TODO(burdon): Factor out across tests.
    const actions = faker.helpers.multiple(
      () => ({
        id: faker.string.uuid(),
        label: faker.lorem.words(2),
        icon: Circle,
        invoke: () => {
          console.log('invoke');
        },
        properties: {},
      }),
      { count: 20 },
    );

    // TODO(burdon): Goal: Factor-out CMD-K like dialog.
    return (
      <NavTreeItemAction
        icon={List}
        actions={actions}
        menuType='searchList'
        label='Select action'
        onAction={(action) => {
          console.log(action);
        }}
      />
    );
  },
};
