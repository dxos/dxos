//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { type SizeArgs, withSizes } from '../../stories.tsx';
import { byTestId } from '../../testing.ts';

type ConfirmProps = SizeArgs & {
  testId: string;
  /** Mark the Action as the control that takes focus on open. */
  autofocusAction?: boolean;
  onAction: () => void;
};

const Confirm = ({ size, testId, autofocusAction, onAction }: ConfirmProps) => (
  <Next.AlertDialog.Root>
    <Next.AlertDialog.Trigger asChild>
      <Next.Button data-testid={`${testId}-trigger`}>Delete space</Next.Button>
    </Next.AlertDialog.Trigger>
    <Next.AlertDialog.Content size={size} data-testid={testId}>
      <Next.AlertDialog.Header>
        <Next.AlertDialog.Title>Delete space?</Next.AlertDialog.Title>
      </Next.AlertDialog.Header>
      <Next.AlertDialog.Body>
        <Next.AlertDialog.Description>Its objects are removed for every member.</Next.AlertDialog.Description>
      </Next.AlertDialog.Body>
      <Next.AlertDialog.Footer>
        <Next.AlertDialog.Cancel>Cancel</Next.AlertDialog.Cancel>
        <Next.AlertDialog.Action
          variant='destructive'
          onClick={onAction}
          {...(autofocusAction && { [Next.DIALOG_AUTOFOCUS_ATTRIBUTE]: '' })}
        >
          Delete
        </Next.AlertDialog.Action>
      </Next.AlertDialog.Footer>
    </Next.AlertDialog.Content>
  </Next.AlertDialog.Root>
);

/** An alert dialog focusing Cancel on open, and one whose Action is marked with `DIALOG_AUTOFOCUS_ATTRIBUTE`. */
const DefaultStory = ({ size = 'md' }: SizeArgs) => {
  const [deleted, setDeleted] = useState(0);
  return (
    <Next.Group>
      <Confirm size={size} testId={`confirm-${size}`} onAction={() => setDeleted((count) => count + 1)} />
      <Confirm
        size={size}
        testId={`marked-${size}`}
        autofocusAction
        onAction={() => setDeleted((count) => count + 1)}
      />
      <Next.Typography data-testid={`deleted-${size}`}>Deleted {deleted}</Next.Typography>
    </Next.Group>
  );
};

const meta = {
  title: 'ui/react-ui-core/next/components/AlertDialog',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * An `alertdialog` named by its title and described by its description; it opens with focus on Cancel (the least
 * destructive choice) unless a control carries `DIALOG_AUTOFOCUS_ATTRIBUTE`. A click outside does not dismiss it;
 * Cancel and Escape close it without acting; Action runs its handler and closes. The story ends open.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const trigger = byTestId(canvasElement, 'confirm-md-trigger');

    await userEvent.click(trigger);
    let dialog = await body.findByRole('alertdialog', { name: 'Delete space?' });
    await expect(dialog).toHaveAccessibleDescription('Its objects are removed for every member.');
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
    await waitFor(() => expect(cancel).toHaveFocus());

    // An outside click does not dismiss an alert dialog.
    const outside = dialog.parentElement ?? canvasElement.ownerDocument.body;
    await fireEvent.pointerDown(outside);
    await fireEvent.pointerUp(outside);
    await fireEvent.click(outside);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(body.getByRole('alertdialog')).toBe(dialog);

    await userEvent.click(cancel);
    await waitFor(() => expect(body.queryByRole('alertdialog')).toBeNull());
    await expect(byTestId(canvasElement, 'deleted-md')).toHaveTextContent('Deleted 0');

    await userEvent.click(trigger);
    dialog = await body.findByRole('alertdialog');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('alertdialog')).toBeNull());

    await userEvent.click(trigger);
    dialog = await body.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(body.queryByRole('alertdialog')).toBeNull());
    await expect(byTestId(canvasElement, 'deleted-md')).toHaveTextContent('Deleted 1');

    // The marked control takes focus instead of Cancel; rest open.
    await userEvent.click(byTestId(canvasElement, 'marked-md-trigger'));
    dialog = await body.findByRole('alertdialog');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Delete' })).toHaveFocus());
  },
};
