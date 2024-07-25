//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { faker } from '@dxos/random';
import { DensityProvider, Tooltip } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { NavTreeItemAction, NavTreeItemActionSearchList } from './NavTreeItemAction';
import { type NavTreeActionNode } from '../types';

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
      () =>
        ({
          id: faker.string.uuid(),
          data: () => {
            console.log('invoke');
          },
          properties: {
            label: faker.lorem.words(2),
            iconSymbol: 'ph--circle--regular',
          },
        }) satisfies NavTreeActionNode,
      { count: 20 },
    );

    // TODO(burdon): Goal: Factor-out CMD-K like dialog.
    return (
      <NavTreeItemActionSearchList
        iconSymbol='ph--list--regular'
        menuActions={actions}
        label='Select action'
        onAction={(action) => {
          console.log(action);
        }}
      />
    );
  },
};
