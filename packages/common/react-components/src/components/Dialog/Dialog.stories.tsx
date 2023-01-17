//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Button } from '../Button';
import { Dialog } from './Dialog';

export default {
  component: Dialog
};

export const Default = {
  args: {
    openTrigger: <Button>Open dialog</Button>,
    closeTriggers: [
      <Button key='cancel'>Close trigger 1</Button>,
      <Button key='save' variant='primary'>
        Close trigger 2
      </Button>
    ],
    title: 'Dialog title',
    children: 'Dialog content',
    closeLabel: 'Close'
  }
};
