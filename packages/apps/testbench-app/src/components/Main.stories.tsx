//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withMultiClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { Item } from '../data';

import { Main } from './Main';

const meta = {
  title: 'apps/testbench-app/Main',
  component: Main,
  decorators: [
    withTheme,
    withMultiClientProvider({
      numClients: 2,
      types: [Item],
      createIdentity: true,
      createSpace: true,
    }),
  ],
  parameters: {
    layout: {
      type: 'fullscreen',
      classNames: 'grid grid-rows-2 h-full divide-y divide-separator grow overflow-hidden',
    },
  },
} satisfies Meta<typeof Main>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
