//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { random } from '@dxos/random';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { Tooltip } from './Tooltip';

type StoryArgs = {
  tooltips: { label: string; content: string }[];
  defaultOpen?: boolean;
};

const DefaultStory = ({ tooltips, defaultOpen }: StoryArgs) => {
  return (
    <Tooltip.Provider defaultOpen={defaultOpen}>
      <div className='w-32'>
        {tooltips.map(({ label, content }, i) => (
          <Tooltip.Trigger asChild key={i} content={content} side='right'>
            <Button classNames='block w-full'>{label}</Button>
          </Tooltip.Trigger>
        ))}
      </div>
    </Tooltip.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Tooltip',
  component: Tooltip as any,
  render: DefaultStory,
  decorators: [withTheme()],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tooltips: [
      {
        label: 'Tooltip trigger',
        content: 'This is the tooltip content',
      },
    ],
  },
};

export const DefaultOpen: Story = {
  args: {
    defaultOpen: true,
    tooltips: [
      {
        label: 'Tooltip trigger',
        content: 'This is the tooltip content',
      },
    ],
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
      { count: 32 },
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
    const tooltip = await waitFor(() => {
      const element = document.querySelector<HTMLElement>('[role="tooltip"]');
      expect(element).not.toBeNull();
      return element!;
    });
    await waitFor(() => expect(tooltip.textContent).toContain('First tip'));
    await expect(first.getAttribute('aria-describedby')).toContain(tooltip.id);
    await expect(second.getAttribute('aria-describedby')).toBeNull();
    // Positioned beside the trigger rather than left at the portal's origin.
    await waitFor(() => {
      const rect = tooltip.getBoundingClientRect();
      const anchor = first.getBoundingClientRect();
      expect(rect.width).toBeGreaterThan(0);
      expect(Math.abs(rect.left + rect.width / 2 - (anchor.left + anchor.width / 2))).toBeLessThan(anchor.width);
    });

    await userEvent.unhover(first);
    await userEvent.hover(second);
    await waitFor(() => expect(second.getAttribute('aria-describedby')).toBeTruthy());
    await waitFor(() => expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Second tip'));
    await expect(first.getAttribute('aria-describedby')).toBeNull();
  },
};
