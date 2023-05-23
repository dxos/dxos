//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Button } from '../Button';
import {
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogCancel,
  AlertDialogAction,
} from './AlertDialog';

type StorybookAlertDialogProps = Partial<{
  title: string;
  description: string;
  body: string;
  cancelTrigger: string;
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
    <AlertDialogRoot defaultOpen>
      <AlertDialogTrigger asChild>
        <Button>{openTrigger}</Button>
      </AlertDialogTrigger>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
          <p className='mbs-2 mbe-4'>{body}</p>
          <AlertDialogCancel asChild>
            <Button>{cancelTrigger}</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant='primary'>{actionTrigger}</Button>
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialogRoot>
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
