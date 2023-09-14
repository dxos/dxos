//
// Copyright 2022 DXOS.org
//

import React from 'react';

import '@dxosTheme';

import { AlertDialog } from './AlertDialog';
import { Button } from '../Buttons';
import { Toolbar } from '../Toolbar';

type StorybookAlertDialogProps = Partial<{
  title: string;
  description: string;
  body: string;
  cancelTrigger: string; // TODO(burdon): Why trigger?
  actionTrigger: string;
  openTrigger: string;
}>;

const StorybookAlertDialog = ({
  title,
  openTrigger,
  description,
  body,
  cancelTrigger,
  actionTrigger,
}: StorybookAlertDialogProps) => {
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

export default {
  component: StorybookAlertDialog,
};

export const Default = {
  args: {
    title: 'AlertDialog title',
    openTrigger: 'Open AlertDialog',
    description: 'AlertDialog description',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    cancelTrigger: 'Cancel',
    actionTrigger: 'Action',
  },
};
