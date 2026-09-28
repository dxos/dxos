//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { type SizeArgs, withSizes } from '../../stories.tsx';
import { GEOMETRY, byTestId, expectScoped } from '../../testing.ts';

type StoryArgs = SizeArgs & {
  /** Grow the Notes textarea with its content. */
  autoResize?: boolean;
};

const DefaultStory = ({ size, autoResize }: StoryArgs) => (
  <>
    <Next.Field.Root>
      <Next.Field.Label>Title {size}</Next.Field.Label>
      <Next.Input data-testid={`input-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Notes {size}</Next.Field.Label>
      <Next.Textarea autoResize={autoResize} placeholder='Write something' data-testid={`textarea-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Summary {size}</Next.Field.Label>
      <Next.Textarea rows={6} data-testid={`rows-${size}`} />
    </Next.Field.Root>
    <Next.Field.Root>
      <Next.Field.Label>Log {size}</Next.Field.Label>
      <Next.Textarea autoResize placeholder='Grows as you type' data-testid={`auto-${size}`} />
    </Next.Field.Root>
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Textarea',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * At least three lines tall at every size (or `rows`), as wide as an Input, inset like a control, and named by its
 * Field label; with `autoResize` it grows with its content instead of scrolling.
 */
export const Test: Story = {
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

    const textarea = within(canvasElement).getByRole('textbox', { name: 'Notes md' });
    await expect(textarea).toBe(byTestId(canvasElement, 'textarea-md'));
    await expect(textarea.tagName).toBe('TEXTAREA');
    await expectScoped(canvasElement);

    const auto = byTestId(canvasElement, 'auto-md');
    const initial = auto.getBoundingClientRect().height;
    await userEvent.type(auto, 'one{Enter}two{Enter}three{Enter}four{Enter}five{Enter}six');
    await waitFor(() => expect(auto.getBoundingClientRect().height).toBeGreaterThan(initial + 20));
    await expect(auto.scrollHeight).toBeLessThanOrEqual(auto.clientHeight + 1);
  },
};
