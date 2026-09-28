//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { type Size } from '../../sizes.ts';
import { GEOMETRY, expectAnchoredBelow, expectArrow } from '../../testing.ts';

type StoryArgs = {
  size?: Size;
  arrow?: boolean;
};

const DefaultStory = ({ size, arrow }: StoryArgs) => (
  <Next.Popover.Root>
    <Next.Popover.Trigger asChild>
      <Next.Button data-testid='trigger'>Share</Next.Button>
    </Next.Popover.Trigger>
    <Next.Popover.Content size={size} arrow={arrow} data-testid='popover'>
      <Next.Popover.Header>
        <Next.Popover.Title>Share space</Next.Popover.Title>
        <Next.Popover.CloseTrigger />
      </Next.Popover.Header>
      <Next.Popover.Description>Anyone with the link can view.</Next.Popover.Description>
      <Next.Field.Root>
        <Next.Field.Label>Link</Next.Field.Label>
        <Next.Input defaultValue='https://composer.space/s/123' readOnly />
      </Next.Field.Root>
      <Next.Group justify='end'>
        <Next.Popover.CloseTrigger asChild>
          <Next.Button>Done</Next.Button>
        </Next.Popover.CloseTrigger>
      </Next.Group>
    </Next.Popover.Content>
  </Next.Popover.Root>
);

const meta = {
  title: 'ui/react-ui-core/next/components/popover',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Opens a portalled `dialog` named by its title, 2px from the trigger at `level='popup'`; the story ends open. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByTestId('trigger');
    const body = within(canvasElement.ownerDocument.body);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    const popover = await body.findByRole('dialog', { name: 'Share space' });
    await expect(popover).toBe(body.getByTestId('popover'));
    await expect(popover).toHaveAccessibleDescription('Anyone with the link can view.');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(popover).toHaveAttribute('data-surface', 'popup');
    await expect(popover).toHaveAttribute('data-size', 'md');
    await expect(getComputedStyle(popover).getPropertyValue('--nx-level').trim()).toBe('5');
    await expectAnchoredBelow(trigger, popover, 'center');
    await expectArrow(trigger, popover);
    await waitFor(() => expect(popover.contains(canvasElement.ownerDocument.activeElement)).toBe(true));
  },
};

/** The popover takes its own size, since it leaves the trigger's sized scope. */
export const Small: Story = {
  args: { size: 'sm' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByTestId('trigger'));
    const popover = await within(canvasElement.ownerDocument.body).findByRole('dialog');
    await expect(popover).toHaveAttribute('data-size', 'sm');
    const header = popover.querySelector<HTMLElement>('[data-part="header"]');
    await expect(header?.getBoundingClientRect().height).toBeCloseTo(GEOMETRY.sm.block, 0);
  },
};

/** `arrow={false}` drops the arrow and its share of the gutter, so the panel sits 2px from the trigger. */
export const NoArrow: Story = {
  args: { arrow: false },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByTestId('trigger');
    await userEvent.click(trigger);
    const popover = await within(canvasElement.ownerDocument.body).findByRole('dialog');
    await expect(popover.querySelector('[data-part="arrow"]')).toBeNull();
    await expectAnchoredBelow(trigger, popover, 'center');
  },
};

/** Escape, the header's close button and Done each close it, returning focus to the trigger; ends closed by design. */
export const Dismiss: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByTestId('trigger');
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(trigger);
    const popover = await body.findByRole('dialog');
    // Escape reaches the popover once its initial focus has landed inside it.
    await waitFor(() => expect(popover.contains(canvasElement.ownerDocument.activeElement)).toBe(true));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());

    for (const name of ['Close', 'Done']) {
      await userEvent.click(trigger);
      const reopened = await body.findByRole('dialog');
      await userEvent.click(within(reopened).getByRole('button', { name }));
      await waitFor(() => expect(body.queryByRole('dialog'), name).toBeNull());
    }
  },
};
