//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TimeSeriesCard } from './TimeSeriesCard.tsx';

const meta = {
  title: 'devtools/devtools/cards/TimeSeriesCard',
  component: TimeSeriesCard,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof TimeSeriesCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
