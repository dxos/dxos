//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Button, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Waveform, type WaveformProps } from './Waveform.tsx';

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
          <Button
            classNames='p-1 min-h-1 rounded-sm'
            label='Waveform'
            iconOnly
            icon='ph--waveform--regular'
            iconSize='xs'
          />
          <Button
            classNames='p-1 min-h-1 rounded-sm'
            label='Waveform'
            iconOnly
            icon='ph--waveform--regular'
            iconSize='md'
          />
          <Button
            classNames='p-1 min-h-1 rounded-sm'
            label='Waveform'
            iconOnly
            icon='ph--waveform--regular'
            iconSize='lg'
          />
          <Button
            classNames='p-1 min-h-1 rounded-sm'
            label='Waveform'
            iconOnly
            icon='ph--waveform--regular'
            iconSize='xl'
          />
        </div>
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-components/Waveform',
  component: Waveform,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
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
