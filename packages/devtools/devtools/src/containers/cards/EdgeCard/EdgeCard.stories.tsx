//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { edgeSocket, edgeStatus, edgeStatusDegraded } from '../testing/fixtures.ts';
import { EdgeCard } from './EdgeCard.tsx';

const meta = {
  title: 'devtools/devtools/cards/EdgeCard',
  component: EdgeCard,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof EdgeCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { edge: edgeSocket, status: edgeStatus, onRefresh: () => {}, onCopy: () => {} },
};

export const Degraded: Story = {
  args: { status: edgeStatusDegraded, onRefresh: () => {} },
};

export const Empty: Story = {};
