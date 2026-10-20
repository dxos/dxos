//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useControls } from 'leva';
import React from 'react';

import { useAudioStream } from '@dxos/react-ui-audio';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { applyValues, levaControls, toConfig } from '../Avatar/stories/tuner.ts';
import { chaos } from '../Avatar/visualizations/chaos.ts';
import { chaosPresets, defaultChaosOptions } from './chaos-presets.ts';
import { Chaos, type ChaosProps } from './Chaos.tsx';

type StoryProps = ChaosProps & {
  /** Drives the cloud from the microphone. */
  microphone?: boolean;
  preset?: string;
};

const DefaultStory = ({ microphone = false, preset, ...props }: StoryProps) => {
  const start = (preset && chaosPresets[preset]) || defaultChaosOptions;
  const values = toConfig(useControls('Chaos', levaControls(chaos.params, start), [preset]));
  const { getAverage } = useAudioStream(microphone);

  return (
    <div className='flex grow items-center justify-center'>
      <Chaos {...props} options={applyValues(start, values)} getValue={microphone ? getAverage : undefined} />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-experimental/Chaos',
  component: Chaos,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<StoryProps>;

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {
  args: {
    classNames: 'w-[256px] h-[256px]',
  },
};

export const Large: Story = {
  args: {
    classNames: 'w-[512px] h-[512px]',
  },
};

export const Droplet: Story = {
  args: {
    preset: 'droplet',
    classNames: 'w-[512px] h-[512px]',
  },
};

export const Microphone: Story = {
  args: {
    microphone: true,
    classNames: 'w-[512px] h-[512px]',
  },
};
