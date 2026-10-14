//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { indexerRows } from '../testing/fixtures.ts';
import { IndexerCard } from './IndexerCard.tsx';

const meta = {
  title: 'devtools/devtools/cards/IndexerCard',
  component: IndexerCard,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof IndexerCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { spaces: indexerRows, onRefresh: () => {}, onCopy: () => {} },
};

export const Empty: Story = {};
