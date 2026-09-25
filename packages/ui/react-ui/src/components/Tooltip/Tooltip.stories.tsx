//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { invariant } from '@dxos/invariant';
import { random } from '@dxos/random';

import { withTheme } from '../../testing/index.ts';
import { Button } from '../Button/index.ts';
import { Tooltip, type TooltipSide } from './Tooltip.tsx';

type StoryArgs = {
  tooltips: { label: string; content: string }[];
  side?: TooltipSide;
  defaultOpen?: boolean;
};

const DefaultStory = ({ tooltips, side, defaultOpen }: StoryArgs) => {
  return (
    <Tooltip.Provider defaultOpen={defaultOpen}>
      {/* Centered here, since the test runner ignores `layout` and a corner trigger flips the tooltip. */}
      <div className='grid place-items-center w-screen h-screen'>
        <div className='w-32'>
          {tooltips.map(({ label, content }, i) => (
            <Tooltip.Trigger asChild key={i} content={content} side={side}>
              <Button classNames='block w-full'>{label}</Button>
            </Tooltip.Trigger>
          ))}
        </div>
      </div>
    </Tooltip.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Tooltip',
  component: Tooltip as any,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const tooltips = [
  {
    label: 'Tooltip trigger',
    content: 'This is the tooltip content',
  },
];

export const Default: Story = {
  args: {
    tooltips,
  },
};

export const DefaultOpen: Story = {
  args: {
    defaultOpen: true,
    tooltips,
  },
  play: async () => {
    // Portaled, so read from the document; open on mount, before any trigger is hovered.
    await waitFor(() => expect(within(document.body).getByText('This is the tooltip content')).toBeVisible());
  },
};

export const Left: Story = {
  args: {
    defaultOpen: true,
    tooltips,
    side: 'left',
  },
  play: async () => {
    await waitFor(() => expect(within(document.body).getByText('This is the tooltip content')).toBeVisible());
    await expect(document.querySelector('[data-part="content"]')?.getAttribute('data-placement')).toBe('left');
  },
};

export const Right: Story = {
  args: {
    defaultOpen: true,
    tooltips,
    side: 'right',
  },
  play: async () => {
    await waitFor(() => expect(within(document.body).getByText('This is the tooltip content')).toBeVisible());
    await expect(document.querySelector('[data-part="content"]')?.getAttribute('data-placement')).toBe('right');
  },
};

export const Top: Story = {
  args: {
    defaultOpen: true,
    tooltips,
    side: 'top',
  },
  play: async () => {
    await waitFor(() => expect(within(document.body).getByText('This is the tooltip content')).toBeVisible());
    await expect(document.querySelector('[data-part="content"]')?.getAttribute('data-placement')).toBe('top');
  },
};

export const Bottom: Story = {
  args: {
    defaultOpen: true,
    tooltips,
    side: 'bottom',
  },
  play: async () => {
    await waitFor(() => expect(within(document.body).getByText('This is the tooltip content')).toBeVisible());
    await expect(document.querySelector('[data-part="content"]')?.getAttribute('data-placement')).toBe('bottom');
  },
};

export const StressTest: Story = {
  args: {
    defaultOpen: true,
    tooltips: random.helpers.multiple(
      () => ({
        label: random.lorem.words(2),
        content: random.lorem.words(5),
      }),
      {
        count: 32,
      },
    ),
  },
};

/**
 * Hovering a trigger opens the one tooltip at that trigger, describing only it; moving to another
 * trigger hands the tooltip over.
 */
export const TestHover: Story = {
  args: {
    tooltips: [
      { label: 'First', content: 'First tip' },
      { label: 'Second', content: 'Second tip' },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [first, second] = canvas.getAllByRole('button');

    await userEvent.hover(first);
    const tooltip = await waitFor(async () => {
      const element = document.querySelector<HTMLElement>('[role="tooltip"]');
      await expect(element).not.toBeNull();
      invariant(element);
      return element;
    });
    await waitFor(() => expect(tooltip.textContent).toContain('First tip'));
    await expect(first.getAttribute('aria-describedby')).toContain(tooltip.id);
    await expect(second.getAttribute('aria-describedby')).toBeNull();
    // Positioned beside the trigger rather than left at the portal's origin.
    await waitFor(async () => {
      const rect = tooltip.getBoundingClientRect();
      const anchor = first.getBoundingClientRect();
      await expect(rect.width).toBeGreaterThan(0);
      await expect(Math.abs(rect.left + rect.width / 2 - (anchor.left + anchor.width / 2))).toBeLessThan(anchor.width);
    });

    await userEvent.unhover(first);
    await userEvent.hover(second);
    await waitFor(() => expect(second.getAttribute('aria-describedby')).toBeTruthy());
    await waitFor(() => expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Second tip'));
    await expect(first.getAttribute('aria-describedby')).toBeNull();
  },
};
