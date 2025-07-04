//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Button, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Spinner, type SpinnerProps } from './Spinner';

const DefaultStory = ({ active: _active }: SpinnerProps) => {
  const [active, setActive] = useState(_active);

  return (
    <div className='flex flex-col grow'>
      <Toolbar.Root>
        <Button onClick={() => setActive((active) => !active)}>Toggle</Button>
      </Toolbar.Root>
      <div className='flex grow items-center justify-center'>
        <div className='flex w-6 h-6'>
          <Spinner active={active} />
        </div>
      </div>
    </div>
  );
};

const meta: Meta<SpinnerProps> = {
  title: 'ui/react-ui-sfx/Spinner',
  component: Spinner,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<SpinnerProps>;

export const Default: Story = {
  args: {
    active: false,
  },
};
