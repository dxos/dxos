//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { defaultFocus, hover, defaultActive, Button, mx } from '@dxos/aurora';

import { Avatar } from '../Avatar';
import { Popover } from './Popover';

export default {
  component: Popover
};

export const Default = {
  args: {
    openTrigger: <Button>Open popover</Button>,
    children: 'Popover content'
  }
};

export const AvatarTrigger = {
  args: {
    openTrigger: (
      <Avatar
        slots={{
          root: {
            tabIndex: 0,
            className: mx('shadow-md cursor-pointer rounded-md', hover(), defaultFocus, defaultActive)
          }
        }}
        label={<span className='sr-only'>Open popover</span>}
        fallbackValue='open popover'
      />
    ),
    closeLabel: 'Close',
    children: 'Popover content'
  }
};
