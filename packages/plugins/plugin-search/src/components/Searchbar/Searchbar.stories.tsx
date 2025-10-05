//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Searchbar } from './Searchbar';

const meta = {
  title: 'plugins/plugin-search/Searchbar',
  component: Searchbar,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Searchbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Search...',
  },
};
