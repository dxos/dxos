//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZE_ARG_TYPES, type SizeArgs } from '../../testing/stories.tsx';
import { Button, Group, Panel, ScrollContainer, type ScrollContainerRootProps, Toolbar, Typography } from '../index.ts';

type StoryArgs = SizeArgs & Pick<ScrollContainerRootProps, 'pin'>;

const DefaultStory = ({ pin }: StoryArgs) => {
  const [rows, setRows] = useState(() => Array.from({ length: 100 }, (_, index) => `Entry ${index + 1}`));

  return (
    <Panel.Root>
      <Panel.Header asChild>
        <Toolbar.Root>
          <Button label='Add entry' onClick={() => setRows((rows) => [...rows, `Entry ${rows.length + 1}`])} />
        </Toolbar.Root>
      </Panel.Header>
      <ScrollContainer.Root pin={pin}>
        <Panel.Body asChild>
          <ScrollContainer.Content data-testid='frame'>
            <ScrollContainer.Fade />
            <ScrollContainer.Viewport data-testid='viewport'>
              {rows.map((row) => (
                <Typography key={row}>{row}</Typography>
              ))}
            </ScrollContainer.Viewport>
            <ScrollContainer.Fade edge='bottom' />
            <ScrollContainer.ScrollDownButton />
          </ScrollContainer.Content>
        </Panel.Body>
      </ScrollContainer.Root>
      <Panel.Footer>{rows.length}</Panel.Footer>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/ScrollContainer',
  render: DefaultStory,
  decorators: [withLayout({ layout: 'column' }), withTheme()],
  args: { size: 'md', pin: true },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A pinned container follows new rows; scrolling up unpins, showing the fade and the button that pins again. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const viewport = canvas.getByTestId('viewport');
    const fade = canvas.getByTestId('frame').querySelector<HTMLElement>('[data-part="fade"][data-edge="top"]');
    const fadeEnd = canvas.getByTestId('frame').querySelector<HTMLElement>('[data-part="fade"][data-edge="bottom"]');
    const button = canvas.getByTestId('frame').querySelector<HTMLElement>('.dx-scroll-container-scroll-down');
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
    await waitFor(() => expect(fadeEnd).toHaveAttribute('data-state', 'hidden'));

    // A new row is followed.
    await userEvent.click(canvas.getByRole('button', { name: 'Add entry' }));
    await waitFor(() => expect(canvas.getByText('Entry 101')).toBeInTheDocument());
    await waitFor(() => expect(atBottom()).toBe(true));

    // Scrolling up by wheel unpins; at the top the fade hides.
    // A wheel interrupts any smooth scroll still following the last row, which a bare `scrollTop` write may not.
    await waitFor(async () => {
      viewport.scrollTop = 0;
      viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }));
      await expect(button).toHaveAttribute('data-state', 'visible');
      await expect(fade).toHaveAttribute('data-state', 'hidden');
      await expect(fadeEnd).toHaveAttribute('data-state', 'visible');
    });
    await userEvent.click(canvas.getByRole('button', { name: 'Add entry' }));
    await waitFor(() => expect(canvas.getByText('Entry 102')).toBeInTheDocument());
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
