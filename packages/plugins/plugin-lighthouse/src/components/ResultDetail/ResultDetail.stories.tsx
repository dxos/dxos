//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { rateAll } from '../../model/rating.ts';
import { toCard } from '../../model/results.ts';
import { entities, extensionNode, extensions, meeple, ratingModel } from '../../testing/fixtures.ts';
import { odynca } from '../../testing/geo-areas-fixture.ts';
import { fuegoDishes } from '../../testing/research-fixture.ts';
import { ResultDetail } from './ResultDetail.tsx';

const entity = {
  ...meeple,
  provenance: [
    { extractor: 'google.maps.search@1.2.0', source: 'https://www.google.com/maps', at: '2026-10-28T12:00:09Z' },
  ],
};

const meta = {
  title: 'plugins/plugin-lighthouse/components/ResultDetail',
  component: ResultDetail,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[28rem]' })],
  parameters: { translations },
} satisfies Meta<typeof ResultDetail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    entity,
    card: toCard(entity),
    rating: rateAll(ratingModel, entities).get(entity.id),
    why: 'About 1,200 games and teachers on every shift.',
    starred: true,
    vote: 'up',
    extensions,
    extensionNodes: { booking: extensionNode },
    onVote: () => {},
    onExtend: () => {},
    onToggleStar: () => {},
    onClose: () => {},
  },
};

/** A deep extension's research: a menu's dishes, grouped by section, from a child research session. */
export const DeepResearch: Story = {
  args: {
    ...Default.args,
    entity,
    card: toCard(entity),
    research: { menu: { status: 'reported', busy: false, items: fuegoDishes } },
  },
};

/** A Warsaw rental: the location row opens the map popover; it lies outside the drawn areas. */
export const Located: Story = {
  args: {
    entity: odynca,
    card: toCard(odynca),
    areaNote: 'outside',
    onClose: () => {},
  },
};
