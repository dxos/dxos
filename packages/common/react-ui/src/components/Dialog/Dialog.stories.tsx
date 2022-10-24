//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { Button } from '../Button';
import { Dialog, DialogProps } from './Dialog';

export default {
  title: 'react-ui/Dialog',
  component: Dialog
};

const Template = ({ children, ...props }: DialogProps) => {
  return <Dialog {...props}>{children}</Dialog>;
};

export const Default = templateForComponent(Template)({ openTrigger: '', title: '', closeTriggers: [''] });
Default.args = {
  openTrigger: <Button>Open dialog</Button>,
  closeTriggers: [
    <Button key='cancel'>Close trigger 1</Button>,
    <Button key='save' variant='primary'>Close trigger 2</Button>
  ],
  title: 'Dialog title',
  children: 'Dialog content',
  closeLabel: 'Close'
};
