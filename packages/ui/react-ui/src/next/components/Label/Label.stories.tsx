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
import { type SizeArgs, withSizes } from '../../stories.tsx';
import { byTestId, expectScoped } from '../../testing.ts';

const LABEL_COLUMNS = 'auto [field-start] minmax(0, 1fr)';

/** Labels of different lengths in rows sharing a content-sized label track. */
const DefaultStory = ({ size }: SizeArgs) => (
  <Next.Container gutter='none' columns={LABEL_COLUMNS}>
    <Next.Container layout='row'>
      <Next.Label htmlFor={`name-${size}`} classNames='pe-(--nx-gap-size)' data-testid={`label-${size}`}>
        Name {size}
      </Next.Label>
      <Next.Input id={`name-${size}`} data-testid={`input-${size}`} />
    </Next.Container>
    <Next.Container layout='row'>
      <Next.Label htmlFor={`display-${size}`} classNames='pe-(--nx-gap-size)'>
        Display name {size}
      </Next.Label>
      <Next.Input id={`display-${size}`} data-testid={`display-${size}`} />
    </Next.Container>
    <Next.Container>
      <Next.Label htmlFor={`search-${size}`} srOnly data-testid={`hidden-label-${size}`}>
        Search {size}
      </Next.Label>
      <Next.Input id={`search-${size}`} placeholder='Search' data-testid={`search-${size}`} />
    </Next.Container>
  </Next.Container>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Label',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * A label names its control, focuses it on click and reads one text step below it; the content-sized label track is
 * shared through subgrid, so every row's input starts at the same x. An `srOnly` label is visually hidden and takes no
 * box, yet still names its input.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const size of SIZES) {
      await expect(canvas.getByLabelText(`Name ${size}`)).toBe(byTestId(canvasElement, `input-${size}`));
      const labelFont = parseFloat(getComputedStyle(byTestId(canvasElement, `label-${size}`)).fontSize);
      const inputFont = parseFloat(getComputedStyle(byTestId(canvasElement, `input-${size}`)).fontSize);
      await expect(labelFont, size).toBeLessThanOrEqual(inputFont);
      await expect(byTestId(canvasElement, `input-${size}`).getBoundingClientRect().left, size).toBeCloseTo(
        byTestId(canvasElement, `display-${size}`).getBoundingClientRect().left,
        0,
      );
    }
    const md = parseFloat(getComputedStyle(byTestId(canvasElement, 'label-md')).fontSize);
    await expect(md).toBeLessThan(parseFloat(getComputedStyle(byTestId(canvasElement, 'input-md')).fontSize));

    await expect(canvas.getByLabelText('Search md')).toBe(byTestId(canvasElement, 'search-md'));
    const hidden = byTestId(canvasElement, 'hidden-label-md').getBoundingClientRect();
    await expect(hidden.width).toBeLessThanOrEqual(1);
    await expect(byTestId(canvasElement, 'search-md').getBoundingClientRect().left).toBeCloseTo(
      byTestId(canvasElement, 'label-md').getBoundingClientRect().left,
      0,
    );

    await userEvent.click(canvas.getByText('Name md'));
    await expect(byTestId(canvasElement, 'input-md')).toHaveFocus();
    await expectScoped(canvasElement);
  },
};
