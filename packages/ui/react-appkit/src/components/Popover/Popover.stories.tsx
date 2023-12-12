//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { Button } from '@dxos/react-ui';
import { focusRing, hoverColors } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Popover } from './Popover';
import { Avatar } from '../Avatar';

export default {
  component: Popover,
  decorators: [withTheme],
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
            classNames: ['shadow-md cursor-pointer rounded-md', hoverColors, focusRing],
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
