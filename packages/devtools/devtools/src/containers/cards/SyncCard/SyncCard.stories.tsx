//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { syncRows } from '../testing/fixtures.ts';
import { SyncCard } from './SyncCard.tsx';

const meta = {
  title: 'devtools/devtools/cards/SyncCard',
  component: SyncCard,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof SyncCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { spaces: syncRows, onCopy: () => {} },
};

export const Empty: Story = {};
