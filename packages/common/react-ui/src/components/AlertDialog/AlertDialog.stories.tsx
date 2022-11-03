//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { Button } from '../Button';
import { AlertDialog, AlertDialogProps } from './AlertDialog';

export default {
  title: 'react-ui/AlertDialog',
  component: AlertDialog
};

const Template = ({ children, ...props }: AlertDialogProps) => {
  return <AlertDialog {...props}>{children}</AlertDialog>;
};

export const Default = templateForComponent(Template)({
  openTrigger: '',
  title: '',
  confirmTrigger: <span />
});
Default.args = {
  openTrigger: <Button>Reset device</Button>,
  cancelTrigger: <Button>Cancel</Button>,
  confirmTrigger: <Button variant='primary'>GO</Button>,
  destructiveConfirmString: "I've definitely had my coffee",
  destructiveConfirmInputProps: {
    label: "Type “I've definitely had my coffee” to confirm"
  },
  title: 'Reset your device'
};
