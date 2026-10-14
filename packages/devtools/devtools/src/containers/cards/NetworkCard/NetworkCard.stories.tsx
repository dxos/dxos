//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { network } from '../testing/fixtures.ts';
import { NetworkCard } from './NetworkCard.tsx';

const meta = {
  title: 'devtools/devtools/cards/NetworkCard',
  component: NetworkCard,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof NetworkCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { network },
};

export const Empty: Story = {};
