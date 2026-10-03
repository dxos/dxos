//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

type StoryArgs = SizeArgs & Pick<Next.ScrollContainerRootProps, 'pin'>;

const DefaultStory = ({ pin }: StoryArgs) => {
  const [rows, setRows] = useState(() => Array.from({ length: 20 }, (_, index) => `Entry ${index + 1}`));
  return (
    <>
      <Next.Group>
        <Next.Button label='Add entry' onClick={() => setRows((rows) => [...rows, `Entry ${rows.length + 1}`])} />
      </Next.Group>
      <Next.ScrollContainer.Root pin={pin}>
        <Next.ScrollContainer.Content classNames='h-[12rem]' data-testid='frame'>
          <Next.ScrollContainer.Fade />
          <Next.ScrollContainer.Viewport data-testid='viewport'>
            {rows.map((row) => (
              <Next.Typography key={row}>{row}</Next.Typography>
            ))}
          </Next.ScrollContainer.Viewport>
          <Next.ScrollContainer.ScrollDownButton />
        </Next.ScrollContainer.Content>
      </Next.ScrollContainer.Root>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/ScrollContainer',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md', pin: true },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A pinned container follows new rows; scrolling up unpins, showing the fade and the button that pins again. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));
    const viewport = canvas.getByTestId('viewport');
    const fade = canvas.getByTestId('frame').querySelector<HTMLElement>('[data-part="fade"]');
    const button = canvas.getByTestId('frame').querySelector<HTMLElement>('.nx-scroll-container-scroll-down');
    if (!button) {
      throw new Error('missing scroll-down button');
    }
    await expect(button).toHaveAttribute('aria-label', 'Scroll down');
    const atBottom = () => Math.abs(viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight) <= 1;

    // Pinned: opens at the end, with the button hidden from pointer and keyboard.
    await waitFor(() => expect(atBottom()).toBe(true));
    await expect(button).toHaveAttribute('data-state', 'hidden');
    await expect(button).toHaveAttribute('tabindex', '-1');
    await expect(fade).toHaveAttribute('data-state', 'visible');

    // A new row is followed.
    await userEvent.click(canvas.getByRole('button', { name: 'Add entry' }));
    await waitFor(() => expect(canvas.getByText('Entry 21')).toBeInTheDocument());
    await waitFor(() => expect(atBottom()).toBe(true));

    // Scrolling up by wheel unpins; at the top the fade hides.
    // A wheel interrupts any smooth scroll still following the last row, which a bare `scrollTop` write may not.
    await waitFor(async () => {
      viewport.scrollTop = 0;
      viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }));
      await expect(button).toHaveAttribute('data-state', 'visible');
      await expect(fade).toHaveAttribute('data-state', 'hidden');
    });
    await userEvent.click(canvas.getByRole('button', { name: 'Add entry' }));
    await waitFor(() => expect(canvas.getByText('Entry 22')).toBeInTheDocument());
    await expect(viewport.scrollTop).toBe(0);

    // The button sits in the frame's end corner and pins again.
    const frame = canvas.getByTestId('frame').getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    await expect(rect.right).toBeLessThan(frame.right);
    await expect(rect.bottom).toBeLessThan(frame.bottom);
    await userEvent.click(button);
    await waitFor(() => expect(atBottom()).toBe(true));
    await expect(button).toHaveAttribute('data-state', 'hidden');
  },
};
