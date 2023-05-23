//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Button } from '@dxos/aurora';
import { defaultFocus, defaultHover, defaultActive } from '@dxos/aurora-theme';

import { Avatar } from '../Avatar';
import { Popover } from './Popover';

export default {
  component: Popover,
};

export const Default = {
  args: {
    openTrigger: <Button>Open popover</Button>,
    children: 'Popover content',
  },
};

export const AvatarTrigger = {
  args: {
    openTrigger: (
      <Avatar
        slots={{
          root: {
            tabIndex: 0,
            classNames: ['shadow-md cursor-pointer rounded-md', defaultHover, defaultFocus, defaultActive],
          },
        }}
        label={<span className='sr-only'>Open popover</span>}
        fallbackValue='open popover'
      />
    ),
    closeLabel: 'Close',
    children: 'Popover content',
  },
};
