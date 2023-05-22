//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Button } from '../Button';
import {
  DialogRoot,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogPortal,
} from './Dialog';

type StorybookDialogProps = Partial<{
  title: string;
  description: string;
  body: string;
  closeTrigger: string;
  openTrigger: string;
}>;

const StorybookDialog = ({ title, openTrigger, description, body, closeTrigger }: StorybookDialogProps) => {
  return (
    <DialogRoot defaultOpen>
      <DialogTrigger asChild>
        <Button>{openTrigger}</Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay>
          <DialogContent>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
            <p className='mbs-2 mbe-4'>{body}</p>
            <DialogClose asChild>
              <Button variant='primary'>{closeTrigger}</Button>
            </DialogClose>
          </DialogContent>
        </DialogOverlay>
      </DialogPortal>
    </DialogRoot>
  );
};

export default {
  component: StorybookDialog,
};

export const Default = {
  args: {
    title: 'Dialog title',
    openTrigger: 'Open Dialog',
    description: 'Dialog description',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    closeTrigger: 'Close trigger',
  },
};
