//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { withMultiClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Main } from './Main';
import { ItemType } from '../data';

export default {
  title: 'apps/testbench-app/Main',
  component: Main,
  decorators: [
    withMultiClientProvider({ numClients: 2, types: [ItemType], createIdentity: true, createSpace: true }),
    withLayout({
      fullscreen: true,
      classNames: ['grid grid-rows-2 h-full divide-y divide-separator grow overflow-hidden'],
    }),
    withTheme,
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
