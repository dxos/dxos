//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { RelatedItemsList } from './RelatedItemsList';

const meta = {
  title: 'plugins/plugin-exemplar/RelatedItemsList',
  component: RelatedItemsList,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
} satisfies Meta<typeof RelatedItemsList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      { id: '1', name: 'First Item', status: 'active' },
      { id: '2', name: 'Second Item', status: 'archived' },
      { id: '3', name: 'Third Item', status: 'draft' },
    ],
  },
};

export const Empty: Story = {
  args: {
    items: [],
  },
};

export const ManyItems: Story = {
  args: {
    items: Array.from({ length: 10 }, (_, index) => ({
      id: String(index),
      name: `Item ${index + 1}`,
      status: ['active', 'archived', 'draft'][index % 3],
    })),
  },
};
