//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { toCard } from '../../model/results.ts';
import { brick, dice, meeple } from '../../testing/fixtures.ts';
import { bemowo, odynca, pulawska, unplaced } from '../../testing/geo-areas-fixture.ts';
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

/** A pinned Warsaw rental: hover or focus the district row for the map popover. */
export const Located: Story = {
  args: { card: toCard(pulawska), score: 0.88, onVote: () => {}, onToggleStar: () => {} },
};

/** Placed to the street only: the popover shows a precision ring. */
export const Approximate: Story = {
  args: { card: toCard(odynca), score: 0.74 },
};

/** Beyond every drawn area: dimmed, with "outside your areas" on the location row. */
export const OutsideAreas: Story = {
  args: { card: toCard(bemowo), score: 0.31, areaNote: 'outside' },
};

/** Names a district but has no point: "no location". */
export const NoLocation: Story = {
  args: { card: toCard(unplaced), score: 0.4 },
};
