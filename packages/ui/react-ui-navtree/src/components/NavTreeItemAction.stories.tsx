//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { NavTreeItemAction, NavTreeItemActionSearchList } from './NavTreeItemAction';
import { type NavTreeActionNode } from '../types';

const meta: Meta = {
  title: 'react-ui-navtree/NavTreeItemAction',
  component: NavTreeItemAction,
  decorators: [withTheme, withLayout({ fullscreen: true, tooltips: true })],
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
