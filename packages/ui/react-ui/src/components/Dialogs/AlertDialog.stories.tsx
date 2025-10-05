//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Button } from '../Buttons';
import { Toolbar } from '../Toolbar';

import { AlertDialog } from './AlertDialog';

type StoryProps = Partial<{
  title: string;
  description: string;
  body: string;
  openTrigger: string;
  cancelTrigger: string;
  actionTrigger: string;
}>;

const DefaultStory = ({ title, description, body, openTrigger, cancelTrigger, actionTrigger }: StoryProps) => {
  return (
    <AlertDialog.Root defaultOpen>
      <AlertDialog.Trigger asChild>
        <Button>{openTrigger}</Button>
      </AlertDialog.Trigger>
      <AlertDialog.Overlay>
        <AlertDialog.Content>
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>{description}</AlertDialog.Description>
          <p className='mbs-2 mbe-8'>{body}</p>
          <Toolbar.Root>
            <div className='grow' />
            <AlertDialog.Cancel asChild>
              <Toolbar.Button>{cancelTrigger}</Toolbar.Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Toolbar.Button variant='primary'>{actionTrigger}</Toolbar.Button>
            </AlertDialog.Action>
          </Toolbar.Root>
        </AlertDialog.Content>
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/AlertDialog',
  component: AlertDialog.Root as any,
  render: DefaultStory as any,
  decorators: [withTheme],
  parameters: {
    chromatic: { disableSnapshot: false },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'AlertDialog title',
    openTrigger: 'Open AlertDialog',
    description: 'AlertDialog description',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    cancelTrigger: 'Cancel',
    actionTrigger: 'Action',
  },
};
