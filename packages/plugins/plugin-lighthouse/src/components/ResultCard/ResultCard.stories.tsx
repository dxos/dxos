//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { toCard } from '../../model/results.ts';
import { brick, dice, meeple } from '../../testing/fixtures.ts';
import { ResultCard } from './ResultCard.tsx';

const meta = {
  title: 'plugins/plugin-lighthouse/components/ResultCard',
  component: ResultCard,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[20rem]' })],
  parameters: { translations },
} satisfies Meta<typeof ResultCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { card: toCard(meeple), score: 0.92, onVote: () => {}, onToggleStar: () => {} },
};

export const Starred: Story = {
  args: { card: toCard(dice), score: 0.61, starred: true, vote: 'up', onVote: () => {}, onToggleStar: () => {} },
};

export const NoImage: Story = {
  args: { card: toCard(brick), current: true },
};
