//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { byTestId, expectArrow, expectPopupSize, realHover, realUnhover } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Button, Group, HoverCard, Typography } from '../index.ts';

/** A profile card above a button, and one below a text link without an arrow, at its own `lg` size. */
const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <Group>
    <HoverCard.Root>
      <HoverCard.Trigger asChild>
        <Button data-testid={`profile-${size}-trigger`}>Alice</Button>
      </HoverCard.Trigger>
      <HoverCard.Content data-testid={`profile-${size}`}>
        <Typography>Alice Example</Typography>
        <Typography tone='description'>Joined in March · 12 spaces</Typography>
      </HoverCard.Content>
    </HoverCard.Root>
    <HoverCard.Root positioning={{ placement: 'bottom' }}>
      <HoverCard.Trigger asChild>
        <a href='#' data-testid={`link-${size}-trigger`}>
          composer.space
        </a>
      </HoverCard.Trigger>
      <HoverCard.Content size='lg' arrow={false} data-testid={`link-${size}`}>
        <Typography>A local-first workspace.</Typography>
      </HoverCard.Content>
    </HoverCard.Root>
  </Group>
);

const meta = {
  title: 'ui/react-ui-core/components/HoverCard',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Hovering the trigger opens the card after the delay, above it at `level='popup'` with an arrow, taking the trigger
 * row's size, above it unless there is no room, its arrow within the trigger's span; the card stays open while the pointer is on it and closes once the pointer leaves both. Keyboard focus
 * opens it too, and blur closes it. `positioning.placement` and `arrow={false}` put the second card below its link with
 * no arrow, at its own size. The story ends open.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const trigger = byTestId(canvasElement, 'profile-md-trigger');

    // Hover opens it after the delay, and leaving the trigger and the card closes it.
    const hovered = performance.now();
    await realHover(trigger);
    const card = await body.findByTestId('profile-md', {}, { timeout: 2_000 });
    await expect(performance.now() - hovered).toBeGreaterThanOrEqual(250);
    await realHover(card);
    await new Promise((resolve) => setTimeout(resolve, 400));
    await expect(body.queryByTestId('profile-md')).not.toBeNull();
    await realUnhover(card);
    await waitFor(() => expect(body.queryByTestId('profile-md')).toBeNull(), { timeout: 2_000 });

    // Keyboard focus opens it; blur closes it.
    trigger.focus();
    await body.findByTestId('profile-md', {}, { timeout: 2_000 });
    trigger.blur();
    await waitFor(() => expect(body.queryByTestId('profile-md')).toBeNull(), { timeout: 2_000 });

    // Below its link, no arrow, at its own size.
    const linkTrigger = byTestId(canvasElement, 'link-md-trigger');
    await realHover(linkTrigger);
    const link = await body.findByTestId('link-md', {}, { timeout: 2_000 });
    await expect(link.querySelector('[data-part="arrow"]')).toBeNull();
    await expectPopupSize(link, 'lg');
    await waitFor(async () => {
      const gap = link.getBoundingClientRect().top - linkTrigger.getBoundingClientRect().bottom;
      await expect(gap >= 0 && gap <= 3, `gap ${gap}`).toBe(true);
    });
    await realUnhover(linkTrigger);
    await waitFor(() => expect(body.queryByTestId('link-md')).toBeNull(), { timeout: 2_000 });

    // The trigger row's size, above the trigger, centred, with an arrow.
    const small = byTestId(canvasElement, 'profile-sm-trigger');
    await realHover(small);
    const smallCard = await body.findByTestId('profile-sm', {}, { timeout: 2_000 });
    await expectPopupSize(smallCard, 'sm');
    await realUnhover(small);
    await waitFor(() => expect(body.queryByTestId('profile-sm')).toBeNull(), { timeout: 2_000 });

    // The lowest row's card opens above it, or below when the test viewport leaves no room above; never over it.
    const large = byTestId(canvasElement, 'profile-xl-trigger');
    await realHover(large);
    const open = await body.findByTestId('profile-xl', {}, { timeout: 2_000 });
    await expect(open).toHaveAttribute('data-surface', 'popup');
    await expect(open).toHaveAttribute('data-size', 'xl');
    await expect(getComputedStyle(open).getPropertyValue('--nx-level').trim()).toBe('5');
    await waitFor(async () => {
      const card = open.getBoundingClientRect();
      const trigger = large.getBoundingClientRect();
      await expect(card.bottom <= trigger.top || card.top >= trigger.bottom, `card ${card.top}-${card.bottom}`).toBe(
        true,
      );
    });
    await expectArrow(large, open);
  },
};
