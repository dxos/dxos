//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { random } from '@dxos/random';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { Input } from '../Input';
import { ScrollArea } from '../ScrollArea';
import { Dialog, DIALOG_AUTOFOCUS_ATTRIBUTE, type DialogContentProps } from './Dialog';

type StoryArgs = Pick<DialogContentProps, 'size'> &
  Partial<{
    title: string;
    description: string;
    openTrigger: string;
    closeTrigger: string;
    blockAlign: 'start' | 'center';
  }>;

/**
 * Standard Dialog with non-scrolling content in Dialog.Body.
 * Dialog.Body propagates the Column grid via subgrid. Children auto-center via --dx-col.
 */
const DefaultStory = ({ size, title, description, openTrigger, closeTrigger, blockAlign }: StoryArgs) => {
  return (
    <Dialog.Root defaultOpen modal>
      <Dialog.Trigger asChild>
        <Button>{openTrigger}</Button>
      </Dialog.Trigger>
      <Dialog.Overlay blockAlign={blockAlign}>
        <Dialog.Content size={size}>
          <Dialog.Header>
            <Dialog.Title>{title}</Dialog.Title>
            {closeTrigger && (
              <Dialog.Close asChild>
                <Dialog.ActionIconButton action='close' />
              </Dialog.Close>
            )}
          </Dialog.Header>
          <Dialog.Body>
            <Dialog.Description>{description}</Dialog.Description>
            <Input.Root>
              <Input.TextInput placeholder='Enter value' />
            </Input.Root>
          </Dialog.Body>
          <Dialog.ActionBar>
            <Dialog.Close asChild>
              <Button variant='primary'>{closeTrigger}</Button>
            </Dialog.Close>
          </Dialog.ActionBar>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

/**
 * Dialog with a ScrollArea child inside Dialog.Body.
 * The ScrollArea breaks out of Body's gutter padding via `--gutter`
 * and applies its own asymmetric padding (accounting for scrollbar width).
 */
const ScrollingStory = ({ size, title, description, openTrigger, closeTrigger, blockAlign }: StoryArgs) => {
  return (
    <Dialog.Root defaultOpen modal>
      <Dialog.Trigger asChild>
        <Button>{openTrigger}</Button>
      </Dialog.Trigger>
      <Dialog.Overlay blockAlign={blockAlign}>
        <Dialog.Content size={size}>
          <Dialog.Header>
            <Dialog.Title>{title}</Dialog.Title>
            {closeTrigger && (
              <Dialog.Close asChild>
                <Dialog.ActionIconButton action='close' />
              </Dialog.Close>
            )}
          </Dialog.Header>
          <Dialog.Body>
            <ScrollArea.Root orientation='vertical' padding thin>
              <ScrollArea.Viewport>
                <Dialog.Description>{description}</Dialog.Description>
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Dialog.Body>
          <Dialog.ActionBar>
            <Dialog.Close asChild>
              <Button variant='primary'>{closeTrigger}</Button>
            </Dialog.Close>
          </Dialog.ActionBar>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Dialog',
  component: Dialog as any,
  render: DefaultStory,
  decorators: [withTheme()],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Dialog title',
    description: random.lorem.paragraph(1),
    openTrigger: 'Open',
    closeTrigger: 'Close',
    blockAlign: 'start',
  },
};

export const Small: Story = {
  args: {
    title: 'Dialog title',
    description: random.lorem.paragraph(1),
    openTrigger: 'Open',
    closeTrigger: 'Close',
    blockAlign: 'center',
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    title: 'Dialog title',
    description: random.lorem.paragraph(1),
    openTrigger: 'Open',
    closeTrigger: 'Close',
    blockAlign: 'center',
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    title: 'Dialog title',
    description: random.lorem.paragraph(2),
    openTrigger: 'Open Dialog',
    closeTrigger: 'Close',
    blockAlign: 'center',
    size: 'lg',
  },
};

export const ExtraLarge: Story = {
  args: {
    title: 'Dialog title',
    description: random.lorem.paragraph(2),
    openTrigger: 'Open Dialog',
    closeTrigger: 'Close',
    blockAlign: 'center',
    size: 'xl',
  },
};

export const Scrolling: Story = {
  render: ScrollingStory,
  args: {
    title: 'Dialog title',
    description: random.lorem.paragraph(20),
    openTrigger: 'Open Dialog',
    closeTrigger: 'Close',
    blockAlign: 'center',
    size: 'md',
  },
};

const dialogElement = () => document.querySelector<HTMLElement>('[role="dialog"]');

/** Opens from the trigger, is labelled and described by its parts, and closes on Escape. */
export const TestOpenClose: StoryObj = {
  render: () => (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button>Open dialog</Button>
      </Dialog.Trigger>
      <Dialog.Overlay>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Described dialog</Dialog.Title>
            <Dialog.Close asChild>
              <Dialog.ActionIconButton action='close' />
            </Dialog.Close>
          </Dialog.Header>
          <Dialog.Body>
            <Dialog.Description>A description the dialog points at.</Dialog.Description>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  ),
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Open dialog' });
    await expect(dialogElement()).toBeNull();
    await userEvent.click(trigger);
    const dialog = await waitFor(async () => {
      const element = dialogElement();
      await expect(element).not.toBeNull();
      return element!;
    });
    await expect(dialog.getAttribute('aria-modal')).toBe('true');
    await waitFor(async () => {
      const labelledBy = dialog.getAttribute('aria-labelledby');
      const describedBy = dialog.getAttribute('aria-describedby');
      await expect(labelledBy && document.getElementById(labelledBy)?.textContent).toBe('Described dialog');
      await expect(describedBy && document.getElementById(describedBy)?.textContent).toContain('description');
    });
    // Focus lands inside the dialog.
    await waitFor(async () => expect(dialog.contains(document.activeElement)).toBe(true));
    await userEvent.keyboard('{Escape}');
    await waitFor(async () => expect(dialogElement()).toBeNull());
  },
};

/** Without a `Description` the dialog carries no `aria-describedby`; the marked control takes focus. */
export const TestNoDescriptionAutoFocus: StoryObj = {
  render: () => (
    <Dialog.Root defaultOpen>
      <Dialog.Overlay>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Undescribed dialog</Dialog.Title>
            <Dialog.Close asChild>
              <Dialog.ActionIconButton action='close' />
            </Dialog.Close>
          </Dialog.Header>
          <Dialog.ActionBar>
            <Dialog.Close asChild>
              <Button {...{ [DIALOG_AUTOFOCUS_ATTRIBUTE]: '' }}>Cancel</Button>
            </Dialog.Close>
            <Button variant='primary'>Commit</Button>
          </Dialog.ActionBar>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  ),
  play: async () => {
    const dialog = await waitFor(async () => {
      const element = dialogElement();
      await expect(element).not.toBeNull();
      return element!;
    });
    // The machine assumes both parts until its first-frame check finds which are rendered.
    await waitFor(async () => {
      await expect(dialog.getAttribute('aria-labelledby')).not.toBeNull();
      await expect(dialog.getAttribute('aria-describedby')).toBeNull();
    });
    await waitFor(async () => expect(document.activeElement?.textContent).toBe('Cancel'));
  },
};
