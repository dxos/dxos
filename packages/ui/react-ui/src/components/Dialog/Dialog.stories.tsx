//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { random } from '@dxos/random';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { Input } from '../Input';
import { ScrollArea } from '../ScrollArea';
import { Dialog, type DialogContentProps } from './Dialog';

type DefaultStoryProps = Pick<DialogContentProps, 'size'> &
  Partial<{
    title: string;
    description: string;
    openTrigger: string;
    closeTrigger: string;
    blockAlign: 'start' | 'center';
  }>;

/**
 * Standard Dialog with non-scrolling content in Dialog.Body.
 * Dialog.Body delegates to Column.Content, which applies gutter padding via `px-[var(--gutter)]`.
 */
const DefaultStory = ({ size, title, description, openTrigger, closeTrigger, blockAlign }: DefaultStoryProps) => {
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
                <Dialog.CloseIconButton />
              </Dialog.Close>
            )}
          </Dialog.Header>
          <Dialog.Body>
            <Dialog.Description>{description}</Dialog.Description>
            <Input.Root>
              <Input.Label>Value</Input.Label>
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
 * The ScrollArea breaks out of Body's gutter padding via `--gutter-offset`
 * and applies its own asymmetric padding (accounting for scrollbar width).
 */
const ScrollingStory = ({ size, title, description, openTrigger, closeTrigger, blockAlign }: DefaultStoryProps) => {
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
                <Dialog.CloseIconButton />
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
