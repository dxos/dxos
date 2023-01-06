//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { defaultFocus, defaultHover, defaultActive } from '../../styles';
import { mx } from '../../util';
import { Avatar } from '../Avatar';
import { Button } from '../Button';
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
            className: mx('button-elevation cursor-pointer rounded-md', defaultHover({}), defaultFocus, defaultActive)
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
