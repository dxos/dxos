//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { memory } from '../testing/fixtures.ts';
import { MemoryCard } from './MemoryCard.tsx';

const meta = {
  title: 'devtools/devtools/cards/MemoryCard',
  component: MemoryCard,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof MemoryCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { memory },
};

export const Empty: Story = {};
