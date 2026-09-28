//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { expectArrow } from '../../testing.ts';

const LONG =
  'Publishing makes this space readable by anyone with the link. Members keep their roles, and you can unpublish at any time.';

const DefaultStory = () => (
  <div className='flex gap-2'>
    <Next.Tooltip.Root>
      <Next.Tooltip.Trigger asChild>
        <Next.Button data-testid='save'>Save</Next.Button>
      </Next.Tooltip.Trigger>
      <Next.Tooltip.Content data-testid='save-tooltip'>Save changes (⌘S)</Next.Tooltip.Content>
    </Next.Tooltip.Root>
    <Next.Tooltip.Root>
      <Next.Tooltip.Trigger asChild>
        <Next.Button data-testid='publish'>Publish</Next.Button>
      </Next.Tooltip.Trigger>
      <Next.Tooltip.Content>{LONG}</Next.Tooltip.Content>
    </Next.Tooltip.Root>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/components/tooltip',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Keyboard focus shows the tooltip, linked to its trigger; the story ends with the long tooltip open. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const save = canvas.getByTestId('save');

    await userEvent.tab();
    await expect(save).toHaveFocus();
    const tooltip = await body.findByRole('tooltip');
    await expect(tooltip).toHaveTextContent('Save changes (⌘S)');
    await expect(save).toHaveAttribute('aria-describedby', tooltip.id);
    await expect(save).toHaveAccessibleDescription('Save changes (⌘S)');

    const content = body.getByTestId('save-tooltip');
    await expect(content).toHaveAttribute('data-surface', 'popup');
    await expect(content).toHaveAttribute('data-size', 'sm');
    await expectArrow(save, content);

    // Hovering another trigger swaps tooltips after the open delay; long text wraps within the 20rem cap.
    await userEvent.hover(canvas.getByTestId('publish'));
    await waitFor(() => expect(body.getByRole('tooltip')).toHaveTextContent('Publishing'));
    const long = body.getByRole('tooltip').getBoundingClientRect();
    await expect(long.width).toBeLessThanOrEqual(320.5);
    await expect(long.height).toBeGreaterThan(40);
  },
};

/** Tabbing straight from one trigger to the next swaps tooltips, and the second stays open past the open delay. */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.tab();
    await expect(canvas.getByTestId('save')).toHaveFocus();
    await waitFor(() => expect(body.getByRole('tooltip')).toHaveTextContent('Save changes'));

    await userEvent.tab();
    await expect(canvas.getByTestId('publish')).toHaveFocus();
    await waitFor(() => expect(body.getByRole('tooltip')).toHaveTextContent('Publishing'));
    await new Promise((resolve) => setTimeout(resolve, 500));
    const tooltips = body.getAllByRole('tooltip');
    await expect(tooltips).toHaveLength(1);
    await expect(tooltips[0]).toHaveTextContent('Publishing');
    await expect(canvas.getByTestId('publish')).toHaveAttribute('aria-describedby', tooltips[0].id);
  },
};

/** Tabbing off the last trigger still closes its tooltip, although the close is deferred by a task. */
export const Blur: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.tab();
    await userEvent.tab();
    await waitFor(() => expect(body.getByRole('tooltip')).toHaveTextContent('Publishing'));
    await userEvent.tab();
    await waitFor(() => expect(body.queryByRole('tooltip')).toBeNull());
  },
};
