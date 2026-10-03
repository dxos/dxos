//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { queries } from '../../../cards/testing/fixtures.ts';
import { QueryMetricsTable } from './QueryMetricsTable.tsx';

const meta = {
  title: 'devtools/devtools/panels/QueryMetricsTable',
  component: QueryMetricsTable,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
} satisfies Meta<typeof QueryMetricsTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { queries, onReset: () => {} },
};

export const Empty: Story = {
  args: { queries: [] },
};
