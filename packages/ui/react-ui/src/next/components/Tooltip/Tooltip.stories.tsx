//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { type SizeArgs, withSizes } from '../../stories.tsx';
import { byTestId, expectArrow } from '../../testing.ts';

const LONG =
  'Publishing makes this space readable by anyone with the link. Members keep their roles, and you can unpublish at any time.';

/** Two triggers, then an Input without a tooltip to tab onto. */
const DefaultStory = ({ size }: SizeArgs) => (
  <Next.Group>
    <Next.Tooltip.Root>
      <Next.Tooltip.Trigger asChild>
        <Next.Button data-testid={`save-${size}`}>Save</Next.Button>
      </Next.Tooltip.Trigger>
      <Next.Tooltip.Content data-testid={`save-tooltip-${size}`}>Save changes (⌘S)</Next.Tooltip.Content>
    </Next.Tooltip.Root>
    <Next.Tooltip.Root>
      <Next.Tooltip.Trigger asChild>
        <Next.Button data-testid={`publish-${size}`}>Publish</Next.Button>
      </Next.Tooltip.Trigger>
      <Next.Tooltip.Content>{LONG}</Next.Tooltip.Content>
    </Next.Tooltip.Root>
    <Next.Input aria-label={`Note ${size}`} data-testid={`note-${size}`} />
  </Next.Group>
);

const meta = {
  title: 'ui/react-ui-core/next/components/tooltip',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Keyboard focus shows the tooltip, linked to its trigger; tabbing straight to the next trigger swaps tooltips and the
 * second stays open past the open delay; tabbing off a trigger still closes its tooltip, although the close is deferred
 * by a task; hovering shows it after the delay, and long text wraps within the 20rem cap. The story ends open.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const save = byTestId(canvasElement, 'save-xs');
    const publish = byTestId(canvasElement, 'publish-xs');

    await userEvent.tab();
    await expect(save).toHaveFocus();
    const tooltip = await body.findByRole('tooltip');
    await expect(tooltip).toHaveTextContent('Save changes (⌘S)');
    await expect(save).toHaveAttribute('aria-describedby', tooltip.id);
    await expect(save).toHaveAccessibleDescription('Save changes (⌘S)');

    const content = body.getByTestId('save-tooltip-xs');
    await expect(content).toHaveAttribute('data-surface', 'popup');
    await expect(content).toHaveAttribute('data-size', 'sm');
    await expectArrow(save, content);

    await userEvent.tab();
    await expect(publish).toHaveFocus();
    await waitFor(() => expect(body.getByRole('tooltip')).toHaveTextContent('Publishing'));
    await new Promise((resolve) => setTimeout(resolve, 500));
    const tooltips = body.getAllByRole('tooltip');
    await expect(tooltips).toHaveLength(1);
    await expect(tooltips[0]).toHaveTextContent('Publishing');
    await expect(publish).toHaveAttribute('aria-describedby', tooltips[0].id);

    await userEvent.tab();
    await expect(byTestId(canvasElement, 'note-xs')).toHaveFocus();
    await waitFor(() => expect(body.queryByRole('tooltip')).toBeNull());

    await userEvent.hover(byTestId(canvasElement, 'publish-md'));
    await waitFor(() => expect(body.getByRole('tooltip')).toHaveTextContent('Publishing'));
    const long = body.getByRole('tooltip').getBoundingClientRect();
    await expect(long.width).toBeLessThanOrEqual(320.5);
    await expect(long.height).toBeGreaterThan(40);
  },
};
