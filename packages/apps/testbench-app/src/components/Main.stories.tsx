//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withMultiClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Main } from './Main';
import { ItemType } from '../data';

export default {
  title: 'apps/testbench-app/Main',
  component: Main,
  render: () => <div>Main</div>,
  // render: () => <ClientRepeater component={Main} count={2} types={[ItemType]} createSpace />,
  decorators: [
    withMultiClientProvider({ numClients: 3, types: [ItemType], createIdentity: true, createSpace: true }),
    withLayout({ fullscreen: true, classNames: ['grid grid-row-2 h-full divide-y divide-separator'] }),
    withTheme,
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
