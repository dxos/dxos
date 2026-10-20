//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

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

/** Arrow keys move through the rows, and the detail follows the highlighted query. */
export const Keyboard: Story = {
  args: { queries },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [first, second] = await canvas.findAllByTestId('query-metrics.row');
    await userEvent.click(first);
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(second).toHaveAttribute('data-highlighted'));
    // Prism renders the key and its colon as separate tokens.
    await waitFor(() => expect(canvas.getAllByText('"query"').length).toBeGreaterThan(0));
  },
};
