//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect } from 'storybook/test';

import { random } from '@dxos/random';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../stories.tsx';
import { GEOMETRY, byTestId, centreY, expectScoped, sizeRow } from '../../testing.ts';

random.seed(123);

const TEXT = random.lorem.paragraph();

const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Next.Container>
      <Next.Block rail='start' data-testid={`icon-${size}`}>
        <Next.Icon icon='ph--chat-circle--regular' />
      </Next.Block>
      <Next.Typography data-testid={`text-${size}`}>{TEXT}</Next.Typography>
    </Next.Container>
    <Next.Container layout='row' columns='minmax(0, 1fr) auto'>
      <Next.Typography truncate data-testid={`truncate-${size}`}>
        {TEXT}
      </Next.Typography>
      <Next.Typography tone='description' data-testid={`description-${size}`}>
        Description
      </Next.Typography>
    </Next.Container>
    <Next.Container>
      <Next.Typography asChild>
        <h2 className='font-medium' data-testid={`heading-${size}`}>
          Typography as a heading
        </h2>
      </Next.Typography>
    </Next.Container>
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Typography',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Wrapped text keeps its first line centred in a block, so the rail icon beside it lines up at every size. `truncate`
 * keeps one block-tall line ending in an ellipsis; `tone='description'` takes the secondary text colour.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const icon = byTestId(canvasElement, `icon-${size}`).getBoundingClientRect();
      const element = byTestId(canvasElement, `text-${size}`);
      const text = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      await expect(text.height, size).toBeGreaterThan(parseFloat(style.lineHeight) * 2);
      const firstLine = text.top + parseFloat(style.paddingTop) + parseFloat(style.lineHeight) / 2;
      await expect(centreY(icon), size).toBeCloseTo(firstLine, 0);
    }

    for (const size of SIZES) {
      const truncated = byTestId(canvasElement, `truncate-${size}`);
      await expect(truncated.getBoundingClientRect().height, size).toBeCloseTo(GEOMETRY[size].block, 0);
      await expect(truncated.scrollWidth, size).toBeGreaterThan(truncated.clientWidth);
      await expect(getComputedStyle(truncated).textOverflow).toBe('ellipsis');
      const description = byTestId(canvasElement, `description-${size}`);
      await expect(getComputedStyle(description).color).not.toBe(getComputedStyle(truncated).color);
      await expect(description.getBoundingClientRect().right).toBeLessThanOrEqual(
        sizeRow(canvasElement, size).getBoundingClientRect().right,
      );
    }

    // `asChild` moves the metrics onto the heading itself.
    const heading = byTestId(canvasElement, 'heading-md');
    await expect(heading.tagName).toBe('H2');
    await expect(heading).toHaveAttribute('data-scope', 'typography');
    await expectScoped(canvasElement);
  },
};
