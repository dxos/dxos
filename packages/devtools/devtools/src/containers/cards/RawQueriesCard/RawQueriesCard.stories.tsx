//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { queries } from '../testing/fixtures.ts';
import { groupQueriesByFilter } from '../util.tsx';
import { RawQueriesCard } from './RawQueriesCard.tsx';

const meta = {
  title: 'devtools/devtools/cards/RawQueriesCard',
  component: RawQueriesCard,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof RawQueriesCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { queries: groupQueriesByFilter(queries) },
};

export const Empty: Story = {};
