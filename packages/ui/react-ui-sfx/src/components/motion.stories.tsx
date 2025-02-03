//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { Button, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Ball, type BallProps } from './Ball';

const Render = ({ active: _active }: BallProps) => {
  const [active, setActive] = useState(_active);

  return (
    <div className='flex flex-col grow'>
      <Toolbar.Root>
        <Button onClick={() => setActive((active) => !active)}>Toggle</Button>
      </Toolbar.Root>
      <div className='flex grow items-center justify-center'>
        <div className='flex w-16 h-16'>
          <Ball active={active} />
        </div>
      </div>
    </div>
  );
};

const meta: Meta<BallProps> = {
  title: 'ui/react-ui-sfx/motion',
  component: Ball,
  render: Render,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<BallProps>;

export const Default: Story = {
  args: {
    active: false,
  },
};
