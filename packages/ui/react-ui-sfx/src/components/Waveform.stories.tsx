//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React, { useState } from 'react';

import { Button, IconButton, Toolbar } from '@dxos/react-ui';

import { Waveform, type WaveformProps } from './Waveform';

const DefaultStory = ({ active: _active }: WaveformProps) => {
  const [active, setActive] = useState(_active);

  return (
    <div className='flex flex-col grow'>
      <Toolbar.Root>
        <Button onClick={() => setActive((active) => !active)}>Toggle</Button>
      </Toolbar.Root>
      <div className='flex flex-col gap-4 grow items-center justify-center'>
        <div className='flex gap-4 items-center'>
          <Waveform active={active} size={3} />
          <Waveform active={active} size={4} />
          <Waveform active={active} size={5} />
          <Waveform active={active} size={6} />
        </div>
        <div className='flex gap-4 items-center'>
          <IconButton
            classNames='p-1 min-bs-1 rounded'
            label='Waveform'
            iconOnly
            icon='ph--waveform--regular'
            size={3}
          />
          <IconButton
            classNames='p-1 min-bs-1 rounded'
            label='Waveform'
            iconOnly
            icon='ph--waveform--regular'
            size={4}
          />
          <IconButton
            classNames='p-1 min-bs-1 rounded'
            label='Waveform'
            iconOnly
            icon='ph--waveform--regular'
            size={5}
          />
          <IconButton
            classNames='p-1 min-bs-1 rounded'
            label='Waveform'
            iconOnly
            icon='ph--waveform--regular'
            size={6}
          />
        </div>
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-sfx/Waveform',
  component: Waveform,
  render: DefaultStory,
  decorators: [withTheme],

  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Waveform>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    active: true,
    size: 4,
  },
};
