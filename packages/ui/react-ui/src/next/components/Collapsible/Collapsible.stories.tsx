//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';

const DefaultStory = () => (
  <div className='nx-scope @container w-[30rem] border border-separator' data-size='md'>
    <Next.Container gutter='rail' level='base'>
      <Next.Collapsible.Root data-testid='advanced'>
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
    </Next.Container>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/components/collapsible',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The trigger toggles the section by pointer and keyboard; the story ends open. */
export const Toggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Advanced settings' });
    const content = canvas.getByTestId('content');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
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
