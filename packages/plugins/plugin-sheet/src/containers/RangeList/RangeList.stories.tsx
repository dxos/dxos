//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Next } from '@dxos/react-ui/next';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { translations as sheetTranslations } from '#translations';
import { Sheet, SheetUtil } from '#types';

import { RangeList } from './RangeList.tsx';

const translations = [...sheetTranslations, ...uiTranslations];

/** A detached sheet with three ranges; later ranges take precedence, which is what reordering changes. */
const createSheet = () => {
  const sheet = Sheet.make({ name: 'Ranges', rows: 10, columns: 10 });
  Obj.update(sheet, (sheet) => {
    sheet.ranges.push(
      {
        range: SheetUtil.rangeToIndex(sheet, { from: { col: 0, row: 0 }, to: { col: 1, row: 1 } }),
        key: 'alignment',
        value: 'center',
      },
      {
        range: SheetUtil.rangeToIndex(sheet, { from: { col: 2, row: 2 }, to: { col: 2, row: 4 } }),
        key: 'style',
        value: 'highlight',
      },
      {
        range: SheetUtil.rangeToIndex(sheet, { from: { col: 0, row: 0 }, to: { col: 0, row: 2 } }),
        key: 'style',
        value: 'softwrap',
      },
    );
  });
  return sheet;
};

/** The model's range order, rendered so a play function can read what `onMove` and remove wrote. */
const RangeOrder = ({ sheet: sheetProp }: { sheet: Sheet.Sheet }) => {
  const [sheet] = useObject(sheetProp);
  return (
    <Next.Typography tone='description' data-testid='range-order'>
      {sheet.ranges.map((range) => range.value).join(' ')}
    </Next.Typography>
  );
};

const DefaultStory = () => {
  const [sheet] = useState(createSheet);
  return (
    <>
      <RangeList sheet={sheet} />
      <RangeOrder sheet={sheet} />
    </>
  );
};

const meta = {
  title: 'plugins/plugin-sheet/containers/RangeList',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Rows render in the model's order in a listbox named by the heading; the row's handle (reached by entering the row
 * with ArrowRight) moves it from the keyboard (Alt+ArrowDown), which reorders `sheet.ranges`; Remove, named by the
 * row's text, deletes the row's range from the model; removing every range shows the empty message.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = await canvas.findByRole('listbox', { name: 'Ranges' });
    const order = canvas.getByTestId('range-order');
    await expect(within(list).getAllByRole('option')).toHaveLength(3);
    await expect(order).toHaveTextContent('center highlight softwrap');

    // Keyboard move through the first row's handle.
    const handle = within(list).getAllByRole('button', { name: 'Drag to rearrange' })[0];
    list.focus();
    await userEvent.keyboard('{Home}{ArrowRight}');
    await waitFor(() => expect(handle).toHaveFocus());
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(order).toHaveTextContent('highlight center softwrap'));
    await waitFor(() => expect(within(list).getAllByRole('option')[1]).toHaveTextContent('Align center'));

    // Remove the (now first) highlight range.
    const [first] = within(list).getAllByRole('option');
    await userEvent.click(within(first).getByRole('button', { name: /^Delete .*Highlight/ }));
    await waitFor(() => expect(order).toHaveTextContent('center softwrap'));
    await waitFor(() => expect(within(list).getAllByRole('option')).toHaveLength(2));

    for (const row of within(list).getAllByRole('option')) {
      await userEvent.click(within(row).getByRole('button', { name: /^Delete/ }));
    }
    await waitFor(() => expect(canvas.getByText('No ranges')).toBeVisible());
  },
};

/**
 * pragmatic-drag-and-drop pointer drops cannot be automated (synthetic drags no-op), so this story is checked by hand.
 *
 * Test:
 * 1. Drag the "Wrap text" row by its handle above "Align center"; a drop indicator shows on the target edge.
 * 2. Drop it: the rows and the order line below read "softwrap center highlight".
 * 3. Drag a row and release it over itself: nothing changes and the cursor shows a move (not a copy) badge.
 * 4. Remove "Highlight": the row and the order line both lose it.
 */
export const ManualDrop: Story = {};
