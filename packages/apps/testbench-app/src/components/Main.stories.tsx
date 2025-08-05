//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withMultiClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Item } from '../data';

import { Main } from './Main';

const meta: Meta<typeof Main> = {
  title: 'apps/testbench-app/Main',
  component: Main,
  decorators: [
    withMultiClientProvider({
      numClients: 2,
      types: [Item],
      createIdentity: true,
      createSpace: true,
    }),
    withLayout({
      fullscreen: true,
      classNames: ['grid grid-rows-2 h-full divide-y divide-separator grow overflow-hidden'],
    }),
    withTheme,
  ],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
