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
import { GEOMETRY, byTestId, expectAnchoredBelow, expectArrow } from '../../testing.ts';

type SharePopoverProps = SizeArgs & {
  arrow?: boolean;
  label: string;
  testId: string;
};

const SharePopover = ({ size, arrow, label, testId }: SharePopoverProps) => (
  <Next.Popover.Root>
    <Next.Popover.Trigger asChild>
      <Next.Button data-testid={`${testId}-trigger`}>{label}</Next.Button>
    </Next.Popover.Trigger>
    <Next.Popover.Content size={size} arrow={arrow} data-testid={testId}>
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

/** A popover with the default arrow and one with `arrow={false}`; the content takes the row's size (finding 9). */
const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <Next.Group>
    <SharePopover size={size} label='Share' testId={`popover-${size}`} />
    <SharePopover size={size} arrow={false} label='Share (no arrow)' testId={`plain-${size}`} />
  </Next.Group>
);

const meta = {
  title: 'ui/react-ui-core/next/components/popover',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Escape, the header's close button and Done each close it, returning focus to the trigger. The popover takes its
 * own size, since it leaves the trigger's sized scope; `arrow={false}` drops the arrow and its share of the gutter.
 * It opens a portalled `dialog` named by its title, 2px from the trigger at `level='popup'`; the story ends open.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const trigger = byTestId(canvasElement, 'popover-md-trigger');
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(trigger);
    const dismissed = await body.findByRole('dialog');
    // Escape reaches the popover once its initial focus has landed inside it.
    await waitFor(() => expect(dismissed.contains(canvasElement.ownerDocument.activeElement)).toBe(true));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());

    for (const name of ['Close', 'Done']) {
      await userEvent.click(trigger);
      const reopened = await body.findByRole('dialog');
      await userEvent.click(within(reopened).getByRole('button', { name }));
      await waitFor(() => expect(body.queryByRole('dialog'), name).toBeNull());
    }

    await userEvent.click(byTestId(canvasElement, 'popover-sm-trigger'));
    const small = await body.findByRole('dialog');
    await expect(small).toHaveAttribute('data-size', 'sm');
    const header = small.querySelector<HTMLElement>('[data-part="header"]');
    await expect(header?.getBoundingClientRect().height).toBeCloseTo(GEOMETRY.sm.block, 0);
    await userEvent.click(within(small).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());

    const plainTrigger = byTestId(canvasElement, 'plain-md-trigger');
    await userEvent.click(plainTrigger);
    const plain = await body.findByRole('dialog');
    await expect(plain.querySelector('[data-part="arrow"]')).toBeNull();
    await expectAnchoredBelow(plainTrigger, plain, 'center');
    await userEvent.click(within(plain).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());

    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    const popover = await body.findByRole('dialog', { name: 'Share space' });
    await expect(popover).toBe(body.getByTestId('popover-md'));
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
