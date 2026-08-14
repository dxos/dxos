//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Avatar } from './Avatar';

const meta = {
  title: 'ui/react-ui-card/Avatar',
  component: Avatar,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { actor: { name: 'Ada Lovelace', email: 'ada@example.com' } },
};

export const Square: Story = {
  args: { actor: { name: 'Grace Hopper', email: 'grace@example.com' }, variant: 'square', size: 8 },
};

export const EmailOnly: Story = {
  args: { actor: { email: 'nameless@example.com' } },
};
