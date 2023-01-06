//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { Button } from '../Button';
import { Toast, ToastProps } from './Toast';

export default {
  title: 'react-ui/Toast',
  component: Toast
};

const Template = ({ ...props }: ToastProps) => {
  return <Toast {...props} />;
};

export const Default = templateForComponent(Template)({
  title: ''
});

Default.args = {
  openTrigger: 'Open toast',
  title: 'Hi, this is a toast',
  description: 'This goes away on its own with a timer.',
  actionTriggers: [{ altText: 'Press F5 to reload the page', trigger: <Button>Reload</Button> }],
  closeTrigger: <Button>Close</Button>
};
