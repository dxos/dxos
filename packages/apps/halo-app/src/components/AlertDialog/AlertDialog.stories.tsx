//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Button } from '@dxos/react-components';

import { AlertDialog } from './AlertDialog';

export default {
  component: AlertDialog
};

export const Default = {
  args: {
    openTrigger: <Button>Reset device</Button>,
    cancelTrigger: <Button>Cancel</Button>,
    confirmTrigger: <Button variant='primary'>GO</Button>,
    destructiveConfirmString: "I've definitely had my coffee",
    destructiveConfirmInputProps: {
      label: "Type “I've definitely had my coffee” to confirm"
    },
    title: 'Reset your device'
  }
};
