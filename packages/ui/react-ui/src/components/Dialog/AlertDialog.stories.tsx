//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';

import { withTheme } from '../../testing';
import { Button } from '../Button';

import { AlertDialog } from './AlertDialog';

type StoryProps = Partial<{
  title: string;
  description: string;
  openTrigger: string;
  cancelTrigger: string;
  actionTrigger: string;
}>;

const DefaultStory = ({ title, description, openTrigger, cancelTrigger, actionTrigger }: StoryProps) => {
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
    title: faker.lorem.sentence(3),
    description: faker.lorem.paragraph(1),
    openTrigger: 'Open AlertDialog',
    cancelTrigger: 'Cancel',
    actionTrigger: 'Action',
  },
};
