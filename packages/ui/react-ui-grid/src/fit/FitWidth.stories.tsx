//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { type DxGridPlaneCells } from '@dxos/lit-grid';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type DxGridElement, Grid } from '../Grid/index.ts';
import { CELL_PADDING, FitWidthBox, measureText, useFitWidth } from './FitWidth.tsx';

const headers = ['Title', 'Status', 'Owner', 'Estimate', 'Notes'];
const rows = [
  ['Order laptops for the new hires', 'Todo', 'Ada', '2d', 'Waiting on quote'],
  ['Set up monitors', 'Done', 'Grace', '1d', ''],
  ['Assemble desks', 'Doing', 'Linus', '3d', 'Two arrive damaged'],
];

const initialCells: { grid: DxGridPlaneCells; frozenRowsStart: DxGridPlaneCells } = {
  frozenRowsStart: Object.fromEntries(headers.map((value, col) => [`${col},0`, { value }])),
  grid: Object.fromEntries(
    rows.flatMap((cells, row) => cells.map((value, col): [string, { value: string }] => [`${col},${row}`, { value }])),
  ),
};

type StoryArgs = { width: number };

const DefaultStory = ({ width }: StoryArgs) => {
  const [grid, setGrid] = useState<DxGridElement | null>(null);
  const widths = useMemo(
    () =>
      grid
        ? headers.map(
            (header, col) =>
              Math.max(...[header, ...rows.map((cells) => cells[col])].map((text) => measureText(grid, text))) +
              CELL_PADDING,
          )
        : undefined,
    [grid],
  );
  const fit = useFitWidth({ widths });
  const columns = useMemo(
    () => ({ grid: Object.fromEntries(fit.sizes.map((size, index) => [index, { size, readonly: true }])) }),
    [fit.sizes],
  );

  return (
    <div className='relative h-36 border border-separator' style={{ width }} data-testid='fit-box'>
      <FitWidthBox fit={fit}>
        <Grid.Root id='fit-width'>
          <Grid.Content
            className='[&_.dx-grid]:absolute [&_.dx-grid]:inset-0'
            initialCells={initialCells}
            frozen={{ frozenRowsStart: 1 }}
            limitColumns={fit.sizes.length}
            limitRows={rows.length}
            columns={columns}
            ref={setGrid}
          />
        </Grid.Root>
      </FitWidthBox>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-grid/FitWidth',
  render: (args) => <DefaultStory {...args} />,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { width: 352 },
  play: async ({ canvasElement }) => {
    const box = await within(canvasElement).findByTestId('fit-box');
    await waitFor(async () => {
      const shown = box.querySelectorAll('[data-dx-grid-plane="frozenRowsStart"] [aria-colindex]').length;
      await expect(shown).toBeGreaterThan(0);
      await expect(shown).toBeLessThan(headers.length);
    });
  },
};

/** Narrower than one column's minimum: the first column shrinks to the box instead of overflowing it. */
export const Narrow: Story = {
  args: { width: 40 },
  play: async ({ canvasElement }) => {
    const box = await within(canvasElement).findByTestId('fit-box');
    await waitFor(async () => {
      const cells = box.querySelectorAll('[data-dx-grid-plane="frozenRowsStart"] [aria-colindex]');
      await expect(cells.length).toBe(1);
      const cell = cells[0].getBoundingClientRect();
      const bounds = box.getBoundingClientRect();
      await expect(Math.abs(cell.left - bounds.left)).toBeLessThanOrEqual(2);
      await expect(Math.abs(cell.right - bounds.right)).toBeLessThanOrEqual(2);
    });
  },
};

export const Wide: Story = {
  args: { width: 720 },
};
