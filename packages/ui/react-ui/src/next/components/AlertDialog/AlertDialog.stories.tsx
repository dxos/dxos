//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { type Size } from '../../sizes.ts';
import { byTestId, expectPopupSize } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { AlertDialog, Button, DIALOG_AUTOFOCUS_ATTRIBUTE, Group, Typography } from '../index.ts';

type ConfirmProps = {
  /** Overrides the size the dialog inherits from its trigger's row. */
  contentSize?: Size;
  testId: string;
  /** Mark the Action as the control that takes focus on open. */
  autofocusAction?: boolean;
  onAction: () => void;
};

const Confirm = ({ contentSize, testId, autofocusAction, onAction }: ConfirmProps) => (
  <AlertDialog.Root>
    <AlertDialog.Trigger asChild>
      <Button data-testid={`${testId}-trigger`}>Delete space</Button>
    </AlertDialog.Trigger>
    <AlertDialog.Content size={contentSize} data-testid={testId}>
      <AlertDialog.Header>
        <AlertDialog.Title>Delete space?</AlertDialog.Title>
      </AlertDialog.Header>
      <AlertDialog.Body>
        <AlertDialog.Description>Its objects are removed for every member.</AlertDialog.Description>
      </AlertDialog.Body>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action
          variant='destructive'
          onClick={onAction}
          {...(autofocusAction && { [DIALOG_AUTOFOCUS_ATTRIBUTE]: '' })}
        >
          Delete
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>
);

/**
 * An alert dialog focusing Cancel on open, taking its trigger row's size, and one whose Action is marked with
 * `DIALOG_AUTOFOCUS_ATTRIBUTE`, `lg` at every size.
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => {
  const [deleted, setDeleted] = useState(0);
  return (
    <Group>
      <Confirm testId={`confirm-${size}`} onAction={() => setDeleted((count) => count + 1)} />
      <Confirm
        contentSize='lg'
        testId={`marked-${size}`}
        autofocusAction
        onAction={() => setDeleted((count) => count + 1)}
      />
      <Typography data-testid={`deleted-${size}`}>Deleted {deleted}</Typography>
    </Group>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/AlertDialog',
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
 * An `alertdialog` named by its title and described by its description; it opens with focus on Cancel (the least
 * destructive choice) unless a control carries `DIALOG_AUTOFOCUS_ATTRIBUTE`. A click outside does not dismiss it;
 * Cancel and Escape close it without acting; Action runs its handler and closes. The story ends open.
 */
export const Test: Story = {
  args: { allSizes: true },
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

    // The dialog takes its trigger's row size (Phase 4 decision 2).
    await userEvent.click(byTestId(canvasElement, 'confirm-sm-trigger'));
    dialog = await body.findByRole('alertdialog');
    await expectPopupSize(dialog, 'sm');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('alertdialog')).toBeNull());

    // The marked control takes focus instead of Cancel; rest open.
    await userEvent.click(byTestId(canvasElement, 'marked-md-trigger'));
    dialog = await body.findByRole('alertdialog');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Delete' })).toHaveFocus());
    // An explicit size wins over the inherited one.
    await expectPopupSize(dialog, 'lg');
  },
};
