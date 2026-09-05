//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { random } from '@dxos/random';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { AlertDialog } from './AlertDialog';

type StoryArgs = Partial<{
  title: string;
  description: string;
  openTrigger: string;
  cancelTrigger: string;
  actionTrigger: string;
}>;

const DefaultStory = ({ title, description, openTrigger, cancelTrigger, actionTrigger }: StoryArgs) => {
  return (
    <AlertDialog.Root defaultOpen>
      <AlertDialog.Trigger asChild>
        <Button>{openTrigger}</Button>
      </AlertDialog.Trigger>
      <AlertDialog.Overlay>
        <AlertDialog.Content>
          <AlertDialog.Body>
            <AlertDialog.Title>{title}</AlertDialog.Title>
            <AlertDialog.Description>{description}</AlertDialog.Description>
          </AlertDialog.Body>
          <AlertDialog.ActionBar>
            <div className='grow' />
            <AlertDialog.Cancel asChild>
              <Button>{cancelTrigger}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant='primary'>{actionTrigger}</Button>
            </AlertDialog.Action>
          </AlertDialog.ActionBar>
        </AlertDialog.Content>
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/AlertDialog',
  component: AlertDialog.Root as any,
  render: DefaultStory as any,
  decorators: [withTheme()],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: random.lorem.sentence(3),
    description: random.lorem.paragraph(1),
    openTrigger: 'Open AlertDialog',
    cancelTrigger: 'Cancel',
    actionTrigger: 'Action',
  },
};

/** An alert has the role, ignores a click outside, and closes from Cancel. */
export const TestOutsideClick: StoryObj = {
  render: () => (
    <AlertDialog.Root defaultOpen>
      <AlertDialog.Overlay>
        <AlertDialog.Content>
          <AlertDialog.Body>
            <AlertDialog.Title>Discard changes?</AlertDialog.Title>
            <AlertDialog.Description>They cannot be recovered.</AlertDialog.Description>
          </AlertDialog.Body>
          <AlertDialog.ActionBar>
            <AlertDialog.Cancel asChild>
              <Button>Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant='primary'>Discard</Button>
            </AlertDialog.Action>
          </AlertDialog.ActionBar>
        </AlertDialog.Content>
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  ),
  play: async () => {
    const alert = await waitFor(async () => {
      const element = document.querySelector<HTMLElement>('[role="alertdialog"]');
      await expect(element).not.toBeNull();
      return element!;
    });
    await waitFor(async () => expect(alert.getAttribute('aria-describedby')).not.toBeNull());
    // The modal turns pointer events off outside the alert, which the checked click refuses to
    // cross; the unchecked one reaches the machine's outside-interaction listener, and that is
    // what is under test.
    const backdrop = document.querySelector<HTMLElement>('[data-scope="dialog"][data-part="backdrop"]')!;
    await userEvent.setup({ pointerEventsCheck: 0 }).click(backdrop);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    await userEvent.click(within(alert).getByRole('button', { name: 'Cancel' }));
    await waitFor(async () => expect(document.querySelector('[role="alertdialog"]')).toBeNull());
  },
};
