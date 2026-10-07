//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { performanceEntries } from '../testing/fixtures.ts';
import { PerformanceCard } from './PerformanceCard.tsx';

const meta = {
  title: 'devtools/devtools/cards/PerformanceCard',
  component: PerformanceCard,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof PerformanceCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { entries: performanceEntries },
};

export const Empty: Story = {};
