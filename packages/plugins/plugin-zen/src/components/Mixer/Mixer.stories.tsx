//
// Copyright 2026 DXOS.org
//

import React from 'react';
import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Oscilloscope } from '@dxos/react-ui-sfx';

import { useMixerEngine } from '../../hooks';

import { Mixer } from './Mixer';

const DefaultStory = () => {
  const { engine, playing, outputNode } = useMixerEngine();

  return (
    <div className='dx-container grid grid-cols-[1fr_1fr] gap-8 px-8'>
      <Mixer engine={engine} />
      <div className='flex flex-col justify-center'>
        <Oscilloscope classNames='h-[400px] border-green-500' mode='waveform' active={playing} source={outputNode} />
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-zen/components/Mixer',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Default: Story = {};
