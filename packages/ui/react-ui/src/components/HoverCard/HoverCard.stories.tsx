//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../testing';
import { Button } from '../Button';
import { HoverCard, type HoverCardRootProps } from './HoverCard.tsx';

type StoryProps = Pick<HoverCardRootProps, 'openDelay' | 'closeDelay'> & { side?: 'top' | 'bottom' };

const DefaultStory = ({ openDelay, closeDelay, side = 'top' }: StoryProps) => (
  // A tall scroller under the trigger, so the card can be seen tracking its trigger as the page moves.
  <div className='dx-fill overflow-y-auto'>
    <div className='h-[40rem]' />
    <div className='flex justify-center'>
      <HoverCard.Root openDelay={openDelay} closeDelay={closeDelay}>
        <HoverCard.Trigger asChild>
          <Button data-testid='hover-card.trigger'>Hover me</Button>
        </HoverCard.Trigger>
        <HoverCard.Portal>
          <HoverCard.Content side={side} classNames='p-3 max-w-64' data-testid='hover-card.content'>
            <div className='font-medium'>Run Instructions</div>
            <div className='text-xs text-description'>operation · 11:04:06.000</div>
            <p className='mt-2 text-sm'>What the trigger stands for, shown without a click.</p>
            <HoverCard.Arrow />
          </HoverCard.Content>
        </HoverCard.Portal>
      </HoverCard.Root>
    </div>
    <div className='h-[40rem]' />
  </div>
);

const meta = {
  title: 'ui/react-ui-core/components/HoverCard',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  args: { openDelay: 300, closeDelay: 200 },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TestOpensOnHover: Story = {
  args: { openDelay: 0, closeDelay: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByTestId('hover-card.trigger');
    trigger.scrollIntoView();
    await userEvent.hover(trigger);
    await waitFor(() => expect(document.querySelector('[data-testid="hover-card.content"]')).toBeTruthy(), {
      timeout: 5_000,
    });
    await userEvent.unhover(trigger);
    await waitFor(() => expect(document.querySelector('[data-testid="hover-card.content"]')).toBeFalsy(), {
      timeout: 5_000,
    });
  },
};
