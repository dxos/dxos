//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';

import { withTheme } from '../../testing';
import { Button } from '../Button';

import { Dialog } from './Dialog';

type StoryProps = Partial<{
  title: string;
  description: string;
  openTrigger: string;
  closeTrigger: string;
  blockAlign: 'center' | 'start';
}>;

const DefaultStory = ({ title, description, openTrigger, closeTrigger, blockAlign }: StoryProps) => {
  return (
    <Dialog.Root defaultOpen>
      <Dialog.Trigger asChild>
        <Button>{openTrigger}</Button>
      </Dialog.Trigger>
      <Dialog.Overlay blockAlign={blockAlign}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>{title}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Description>{description}</Dialog.Description>
          <Dialog.Close asChild>
            <Button variant='primary'>{closeTrigger}</Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/Dialog',
  component: Dialog as any,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    chromatic: {
      disableSnapshot: false,
    },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Dialog title',
    description: faker.lorem.paragraph(2),
    openTrigger: 'Open Dialog',
    closeTrigger: 'Close',
    blockAlign: 'center',
  },
};
