//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { traceMessages } from '../testing/fixtures.ts';
import { SwarmTraceCard } from './SwarmTraceCard.tsx';

const meta = {
  title: 'devtools/devtools/cards/SwarmTraceCard',
  component: SwarmTraceCard,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof SwarmTraceCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { messages: traceMessages, spaceCount: 2, onClear: () => {} },
};

export const Unavailable: Story = {
  args: { available: false },
};

export const Empty: Story = {
  args: { spaceCount: 1 },
};
