//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { graphFixture } from '../../testing/graph-fixture.ts';
import { RelationsPanel } from './RelationsPanel.tsx';

const meta = {
  title: 'plugins/plugin-lighthouse/components/RelationsPanel',
  component: RelationsPanel,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[28rem]' })],
  parameters: { translations },
} satisfies Meta<typeof RelationsPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The root's 1-hop relations: a small graph, then the neighbours by predicate. */
export const Default: Story = {
  args: { graph: graphFixture, iri: graphFixture.roots[0] ?? '', onSelect: () => {} },
};

/** While the graph loads. */
export const Loading: Story = {
  args: { iri: graphFixture.roots[0] ?? '' },
};
