//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Button } from '../Button';
import { Toast } from './Toast';

export default {
  component: Toast
};

export const Default = {
  args: {
    openTrigger: 'Open toast',
    title: 'Hi, this is a toast',
    description: 'This goes away on its own with a timer.',
    actionTriggers: [{ altText: 'Press F5 to reload the page', trigger: <Button>Reload</Button> }],
    closeTrigger: <Button>Close</Button>
  }
};
