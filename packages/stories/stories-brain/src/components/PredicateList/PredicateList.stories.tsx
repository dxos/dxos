//
// Copyright 2026 DXOS.org
//

/**
 * Read-only list of distinct predicates across the facts with occurrence counts.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { PredicateList } from './PredicateList';

const meta = {
  title: 'stories/stories-brain/components/PredicateList',
  component: PredicateList,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof PredicateList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    predicates: [
      { predicate: 'works at', count: 4 },
      { predicate: 'is-a', count: 3 },
      { predicate: 'travelsTo', count: 1 },
    ],
  },
};

export const Empty: Story = {
  args: {
    predicates: [],
  },
};
