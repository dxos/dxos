//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Button, Toolbar } from '@dxos/react-ui';

import { Spinner, type SpinnerProps } from './Spinner';

const DefaultStory = ({ state: _state }: SpinnerProps) => {
  const [state, setState] = useState(_state);

  return (
    <div className='flex flex-col grow'>
      <Toolbar.Root>
        <Button onClick={() => setState('pulse')}>Pulse</Button>
        <Button onClick={() => setState('spin')}>Spin</Button>
        <Button onClick={() => setState('flash')}>Flash</Button>
        <Button onClick={() => setState('error')}>Error</Button>
      </Toolbar.Root>
      <div className='flex grow items-center justify-center'>
        <Spinner state={state} size={6} />
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-sfx/Spinner',
  component: Spinner,
  render: DefaultStory,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Spinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
