//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Bug } from '@phosphor-icons/react';
import { type Meta } from '@storybook/react';
import React from 'react';

import { DensityProvider, Tooltip } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { NavTreeItemAction } from './NavTreeItemAction';
import { type TreeNodeAction } from '../types';

const meta: Meta<typeof NavTreeItemAction> = {
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
    // TODO(burdon): Util to create test actions/graph for all tests.
    const action: TreeNodeAction = {
      id: 'test-action',
      label: 'Test',
      invoke: () => {
        console.log('test.invoke');
      },
      actions: [],
      properties: {},
    };

    return (
      <NavTreeItemAction
        id='test'
        icon={Bug}
        level={0}
        action={action}
        actions={action.actions}
        onAction={(action) => {
          console.log(action);
        }}
      />
    );
  },
};
