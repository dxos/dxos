//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

type StoryArgs = SizeArgs & {
  /** Grow the Notes textarea with its content. */
  autoResize?: boolean;
};

const DefaultStory = ({ size, autoResize }: StoryArgs) => (
  <>
    <Next.Field.Root>
      <Next.Field.Label>Title</Next.Field.Label>
      <Next.Input data-testid={`input-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Notes</Next.Field.Label>
      <Next.Textarea autoResize={autoResize} placeholder='Write something' data-testid={`textarea-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Summary</Next.Field.Label>
      <Next.Textarea rows={6} data-testid={`rows-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Log</Next.Field.Label>
      <Next.Textarea autoResize placeholder='Grows as you type' data-testid={`auto-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Draft</Next.Field.Label>
      <Next.Textarea variant='subdued' placeholder='No well' data-testid={`subdued-${size}`} />
    </Next.Field.Root>
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Textarea',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * At least three lines tall at every size (or `rows`), as wide as an Input, inset like a control, and named by its
 * Field label; with `autoResize` it grows with its content instead of scrolling; `subdued` drops the well.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const textarea = byTestId(canvasElement, `textarea-${size}`);
      const input = byTestId(canvasElement, `input-${size}`).getBoundingClientRect();
      const rect = textarea.getBoundingClientRect();
      const style = getComputedStyle(textarea);
      const lineHeight = parseFloat(style.lineHeight);
      await expect(rect.width, `${size} width`).toBeCloseTo(input.width, 0);
      await expect(rect.left, `${size} left`).toBeCloseTo(input.left, 0);
      await expect(rect.height, `${size} height`).toBeGreaterThanOrEqual(3 * lineHeight);
      await expect(parseFloat(style.marginBottom), `${size} inset`).toBeCloseTo(GEOMETRY[size].inset, 0);
    }
    const md = parseFloat(getComputedStyle(byTestId(canvasElement, 'textarea-md')).lineHeight);
    await expect(byTestId(canvasElement, 'rows-md').getBoundingClientRect().height).toBeGreaterThanOrEqual(6 * md);

    const textarea = within(sizeRow(canvasElement, 'md')).getByRole('textbox', { name: 'Notes' });
    await expect(textarea).toBe(byTestId(canvasElement, 'textarea-md'));
    await expect(textarea.tagName).toBe('TEXTAREA');
    await expectScoped(canvasElement);

    const auto = byTestId(canvasElement, 'auto-md');
    const initial = auto.getBoundingClientRect().height;
    await userEvent.type(auto, 'one{Enter}two{Enter}three{Enter}four{Enter}five{Enter}six');
    await waitFor(() => expect(auto.getBoundingClientRect().height).toBeGreaterThan(initial + 20));
    await expect(auto.scrollHeight).toBeLessThanOrEqual(auto.clientHeight + 1);
    await expect(getComputedStyle(byTestId(canvasElement, 'subdued-md')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  },
};
