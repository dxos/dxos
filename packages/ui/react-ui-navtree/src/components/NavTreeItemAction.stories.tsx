//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import { List, Circle } from '@phosphor-icons/react';
import { type Meta } from '@storybook/react';
import React from 'react';

import { DensityProvider, Tooltip } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { NavTreeItemAction } from './NavTreeItemAction';

// TODO(burdon): Goal: Factor-out CMD-K like dialog.

const meta: Meta = {
  // TODO(burdon): Remove title from others (so all appear in ui tree?)
  // title: 'Components/NavTree/NavTreeItemActionSearchList',
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

// TODO(burdon): Required otherwise ID complains:
//  Inferred type of error: packages/ui/react-ui-card/node_modules/@phosphor-icons/react/dist
export default meta;

export const Default = {
  render: ({ debug }: { debug?: boolean }) => {
    const actions = faker.helpers.multiple(
      () => ({
        id: faker.string.uuid(),
        label: faker.lorem.words(2),
        icon: Circle,
        actions: [],
        invoke: () => {},
        properties: {},
      }),
      { count: 20 },
    );

    // TODO(burdon): Util to create test actions/graph for all tests.
    return (
      <NavTreeItemAction
        id='test'
        icon={List}
        level={0}
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
