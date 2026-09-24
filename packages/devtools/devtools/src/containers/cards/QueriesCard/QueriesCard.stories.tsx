//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { queries } from '../testing/fixtures.ts';
import { QueriesCard } from './QueriesCard.tsx';

const meta = {
  title: 'devtools/devtools/cards/QueriesCard',
  component: QueriesCard,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof QueriesCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { queries },
};

export const Empty: Story = {};
