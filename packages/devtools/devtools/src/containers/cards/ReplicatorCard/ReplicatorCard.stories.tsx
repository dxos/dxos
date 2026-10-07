//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { database } from '../testing/fixtures.ts';
import { ReplicatorCard } from './ReplicatorCard.tsx';

const meta = {
  title: 'devtools/devtools/cards/ReplicatorCard',
  component: ReplicatorCard,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof ReplicatorCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { database },
};

export const Empty: Story = {};
