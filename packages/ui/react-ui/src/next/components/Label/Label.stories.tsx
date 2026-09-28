//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { byTestId, expectScoped } from '../../testing.ts';

const LABEL_COLUMNS = 'auto [field-start] minmax(0, 1fr)';

const DefaultStory = () => (
  <div className='nx-scope @container w-[28rem] border border-separator' data-size='md'>
    <Next.Container gutter='rail' columns={LABEL_COLUMNS}>
      {SIZES.map((size) => (
        <Next.Container key={size} size={size} layout='row'>
          <Next.Label htmlFor={`name-${size}`} classNames='pe-(--nx-gap-size)' data-testid={`label-${size}`}>
            Name {size}
          </Next.Label>
          <Next.Input id={`name-${size}`} data-testid={`input-${size}`} />
        </Next.Container>
      ))}
    </Next.Container>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/label',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A label names its control, focuses it on click and reads one text step below it. */
export const Roles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const size of SIZES) {
      await expect(canvas.getByLabelText(`Name ${size}`)).toBe(byTestId(canvasElement, `input-${size}`));
      const labelFont = parseFloat(getComputedStyle(byTestId(canvasElement, `label-${size}`)).fontSize);
      const inputFont = parseFloat(getComputedStyle(byTestId(canvasElement, `input-${size}`)).fontSize);
      await expect(labelFont, size).toBeLessThanOrEqual(inputFont);
    }
    const md = parseFloat(getComputedStyle(byTestId(canvasElement, 'label-md')).fontSize);
    await expect(md).toBeLessThan(parseFloat(getComputedStyle(byTestId(canvasElement, 'input-md')).fontSize));

    await userEvent.click(canvas.getByText('Name md'));
    await expect(byTestId(canvasElement, 'input-md')).toHaveFocus();
    await expectScoped(canvasElement);
  },
};

/** Content-sized label track shared through subgrid: every input starts at the same x. */
export const Columns: Story = {
  play: async ({ canvasElement }) => {
    const left = byTestId(canvasElement, 'input-md').getBoundingClientRect().left;
    for (const size of SIZES) {
      await expect(byTestId(canvasElement, `input-${size}`).getBoundingClientRect().left, size).toBeCloseTo(left, 0);
    }
  },
};
