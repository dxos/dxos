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
import { GEOMETRY, byTestId, controlSize, expectScoped } from '../../testing.ts';

const DefaultStory = () => (
  <div className='nx-scope @container flex flex-col w-[24rem] border border-separator' data-size='md'>
    {SIZES.map((size) => (
      <Next.Container key={size} size={size} gutter='rail' level='base'>
        <Next.Field.Root>
          <Next.Field.Label>Due {size}</Next.Field.Label>
          <Next.DateInput defaultValue='2026-09-29' data-testid={`date-${size}`} />
          <Next.Input aria-label={`Note ${size}`} data-testid={`input-${size}`} />
        </Next.Field.Root>
      </Next.Container>
    ))}
    <Next.Container gutter='rail' level='base'>
      <Next.Field.Root>
        <Next.Field.Label>Starts at</Next.Field.Label>
        <Next.DateInput type='time' defaultValue='09:30' data-testid='time' />
      </Next.Field.Root>
      <Next.Field.Root>
        <Next.Field.Label>Reminder</Next.Field.Label>
        <Next.DateInput type='datetime-local' defaultValue='2026-09-29T09:30' data-testid='datetime' />
      </Next.Field.Root>
      <Next.Field.Root disabled>
        <Next.Field.Label>Archived</Next.Field.Label>
        <Next.DateInput data-testid='disabled' />
      </Next.Field.Root>
    </Next.Container>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/components/date-input',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The row is a control at every size, as wide as an Input, with the trailing Icon at the control's icon size. */
export const Sizes: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const root = byTestId(canvasElement, `date-${size}`);
      const rect = root.getBoundingClientRect();
      const input = byTestId(canvasElement, `input-${size}`).getBoundingClientRect();
      await expect(rect.height, `${size} height`).toBeCloseTo(controlSize(size), 0);
      await expect(rect.width, `${size} width`).toBeCloseTo(input.width, 0);
      await expect(parseFloat(getComputedStyle(root).marginTop), `${size} inset`).toBeCloseTo(GEOMETRY[size].inset, 0);
      const icon = root.querySelector('svg')?.getBoundingClientRect();
      await expect(icon?.width, `${size} icon`).toBeCloseTo(GEOMETRY[size].icon, 0);
      await expect(rect.right - (icon?.right ?? 0), `${size} icon end`).toBeGreaterThan(0);
      await expect(rect.right - (icon?.right ?? 0), `${size} icon end`).toBeLessThanOrEqual(GEOMETRY[size].block / 2);
    }
    await expectScoped(canvasElement);
  },
};

/** Native date, time and date-time inputs, named by their Field labels, with calendar or clock icons. */
export const Types: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const date = canvas.getByLabelText('Due md');
    await expect(date).toHaveAttribute('type', 'date');
    await expect(date).toHaveValue('2026-09-29');
    await expect(canvas.getByLabelText('Starts at')).toHaveAttribute('type', 'time');
    await expect(canvas.getByLabelText('Reminder')).toHaveAttribute('type', 'datetime-local');
    await expect(canvas.getByLabelText('Archived')).toBeDisabled();
    await expect(getComputedStyle(byTestId(canvasElement, 'disabled')).opacity).toBe('0.5');

    const icon = (testId: string) => byTestId(canvasElement, testId).querySelector('use')?.getAttribute('href') ?? '';
    // Icons resolve from the sprite asynchronously.
    await waitFor(() => expect(icon('date-md')).toContain('calendar-blank'));
    await waitFor(() => expect(icon('time')).toContain('clock'));
    await waitFor(() => expect(icon('datetime')).toContain('calendar-dots'));

    // Focus draws the ring on the row, since the bare input has no box of its own.
    await expect(getComputedStyle(byTestId(canvasElement, 'date-md')).boxShadow).toBe('none');
    await userEvent.click(date);
    await waitFor(() => expect(date).toHaveFocus());
    await expect(getComputedStyle(byTestId(canvasElement, 'date-md')).boxShadow).not.toBe('none');
  },
};
