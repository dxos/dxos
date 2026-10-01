//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { realHover, realUnhover, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

const DefaultStory = () => (
  <Next.Collapsible.Root>
    <Next.Collapsible.Trigger>Advanced settings</Next.Collapsible.Trigger>
    <Next.Collapsible.Content data-testid='content'>
      <Next.Typography>These settings change how your space syncs.</Next.Typography>
      <Next.Field.Root>
        <Next.Field.Header>
          <Next.Field.Label>Sync interval</Next.Field.Label>
        </Next.Field.Header>
        <Next.Input defaultValue='30s' />
      </Next.Field.Root>
      <Next.Switch label='Sync over cellular' />
    </Next.Collapsible.Content>
  </Next.Collapsible.Root>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Collapsible',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The trigger toggles the section by pointer and keyboard; the story ends open. */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));
    const trigger = canvas.getByRole('button', { name: 'Advanced settings' });
    const content = canvas.getByTestId('content');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Hover recolours the text and leaves the row unfilled.
    const rest = getComputedStyle(trigger);
    const [restColor, restBackground] = [rest.color, rest.backgroundColor];
    await realHover(trigger);
    await waitFor(() => expect(getComputedStyle(trigger).color).not.toBe(restColor));
    await expect(getComputedStyle(trigger).backgroundColor).toBe(restBackground);
    await realUnhover(trigger);
    await expect(content).not.toBeVisible();

    // The trigger is a block row.
    const block = parseFloat(getComputedStyle(trigger).getPropertyValue('--nx-block-size')) * 16;
    await expect(trigger.getBoundingClientRect().height).toBeCloseTo(block, 0);

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(canvas.getByText('These settings change how your space syncs.')).toBeVisible());
    await expect(trigger).toHaveAttribute('aria-controls', content.id);

    // The caret turns to point down while open.
    const indicator = trigger.querySelector('[data-part="indicator"]');
    await waitFor(() => expect(indicator ? getComputedStyle(indicator).transform : '').not.toBe('none'));

    // `aria-expanded` stays true until the closing animation ends.
    await userEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    await expect(content).not.toBeVisible();

    // Enter on the focused trigger reopens it.
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(canvas.getByRole('textbox', { name: 'Sync interval' })).toBeVisible());
  },
};
