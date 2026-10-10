//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { byTestId, centreY, controlSize, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Group } from '../Group/Group.tsx';
import * as Typography from '../Typography/Typography.tsx';
import * as ToggleGroup from './ToggleGroup.tsx';

/** A single-select group of icon-only items (alignment) and a multiple-select group of text items (marks). */
const DefaultStory = ({ size }: SizeArgs) => {
  const [align, setAlign] = useState('left');
  const [marks, setMarks] = useState<string[]>(['bold']);
  return (
    <>
      <Group>
        <ToggleGroup.Root
          type='single'
          value={align}
          onValueChange={setAlign}
          aria-label='Alignment'
          data-testid={`align-${size}`}
        >
          <ToggleGroup.Item value='left' icon='ph--text-align-left--regular' label='Left' iconOnly />
          <ToggleGroup.Item value='center' icon='ph--text-align-center--regular' label='Centre' iconOnly />
          <ToggleGroup.Item value='right' icon='ph--text-align-right--regular' label='Right' iconOnly />
        </ToggleGroup.Root>
        <ToggleGroup.Root
          type='multiple'
          value={marks}
          onValueChange={setMarks}
          aria-label='Marks'
          data-testid={`marks-${size}`}
        >
          <ToggleGroup.Item value='bold'>Bold</ToggleGroup.Item>
          <ToggleGroup.Item value='italic'>Italic</ToggleGroup.Item>
          <ToggleGroup.Item value='code' disabled>
            Code
          </ToggleGroup.Item>
        </ToggleGroup.Root>
      </Group>
      <Typography.Text data-testid={`state-${size}`}>
        {align} / {marks.join(', ') || 'none'}
      </Typography.Text>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/ToggleGroup',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[36rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Items are control-tall Buttons centred in the row. A single group is a `radiogroup` of `radio` items with one checked,
 * a multiple group a `group` of pressed toggles; checked and pressed items take the accent. The group is one tab stop:
 * arrow keys rove between its items (skipping disabled ones) and Space or Enter changes the value.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const group = byTestId(canvasElement, `align-${size}`).getBoundingClientRect();
      for (const item of byTestId(canvasElement, `align-${size}`).querySelectorAll('button')) {
        const rect = item.getBoundingClientRect();
        await expect(rect.height, size).toBeCloseTo(controlSize(size), 0);
        await expect(centreY(rect), size).toBeCloseTo(centreY(group), 0);
      }
    }
    await expectScoped(canvasElement);

    const canvas = within(sizeRow(canvasElement, 'md'));
    const alignment = canvas.getByRole('radiogroup', { name: 'Alignment' });
    const left = within(alignment).getByRole('radio', { name: 'Left' });
    const centre = within(alignment).getByRole('radio', { name: 'Centre' });
    await expect(left).toHaveAttribute('aria-checked', 'true');
    await expect(centre).toHaveAttribute('aria-checked', 'false');
    const unchecked = getComputedStyle(centre).backgroundColor;
    await expect(getComputedStyle(left).backgroundColor).not.toBe(unchecked);

    await userEvent.click(centre);
    await waitFor(() => expect(centre).toHaveAttribute('aria-checked', 'true'));
    await expect(left).toHaveAttribute('aria-checked', 'false');
    await expect(byTestId(canvasElement, 'state-md')).toHaveTextContent('center / bold');
    await userEvent.keyboard('{ArrowRight}');
    const right = within(alignment).getByRole('radio', { name: 'Right' });
    await waitFor(() => expect(right).toHaveFocus());
    await userEvent.keyboard(' ');
    await waitFor(() => expect(right).toHaveAttribute('aria-checked', 'true'));

    const marks = canvas.getByRole('group', { name: 'Marks' });
    const bold = within(marks).getByRole('button', { name: 'Bold' });
    const italic = within(marks).getByRole('button', { name: 'Italic' });
    await expect(bold).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(italic);
    await waitFor(() => expect(italic).toHaveAttribute('aria-pressed', 'true'));
    await expect(bold).toHaveAttribute('aria-pressed', 'true');
    await expect(byTestId(canvasElement, 'state-md')).toHaveTextContent('right / bold, italic');
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(bold).toHaveFocus());
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(bold).toHaveAttribute('aria-pressed', 'false'));
    await expect(within(marks).getByRole('button', { name: 'Code' })).toBeDisabled();
  },
};
