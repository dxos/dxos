//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withMultiClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Item } from '../data';

import { Main } from './Main';

const meta = {
  title: 'apps/testbench-app/Main',
  component: Main,
  decorators: [
    withTheme,
    withLayout({
      classNames: 'grid grid-rows-2 bs-full divide-y divide-separator grow overflow-hidden',
    }),
    withMultiClientProvider({
      numClients: 2,
      types: [Item],
      createIdentity: true,
      createSpace: true,
    }),
  ],
} satisfies Meta<typeof Main>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
