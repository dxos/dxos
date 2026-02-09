//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useControls } from 'leva';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { useEffect } from 'react';

import { Button } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { useAudioStream } from '../../hooks';
import { type ShaderOptions } from '../../shaders';

import { Chaos, type ChaosProps, defaultShaderOptions, shaderPresets } from './Chaos';

type ControlsOptions = ShaderOptions & { preset: string; audio: boolean };

const DefaultStory = (props: ChaosProps) => {
  const [{ preset, audio, ...options }, setProps] = useControls<ControlsOptions, () => ControlsOptions, any>(
    () =>
      defaultsDeep(
        {
          preset: { value: Object.keys(shaderPresets)[0], options: Object.keys(shaderPresets) },
          audio: { value: true },
        },
        {
          ...defaultShaderOptions,

          // Camera.
          aperture: { value: defaultShaderOptions.aperture, min: 0, max: 5.6 },
          fov: { value: defaultShaderOptions.fov, min: 30, max: 150 },
          zoom: { value: defaultShaderOptions.zoom, min: 0, max: 10 },
          distance: { value: defaultShaderOptions.distance, min: 0, max: 10 },
          focus: { value: defaultShaderOptions.focus, min: -1, max: 1 },
          rotation: { value: defaultShaderOptions.rotation, min: -20, max: 20 },

          // Object.
          size: { value: defaultShaderOptions.size, min: 1, max: 500 },
          speed: { value: defaultShaderOptions.speed, min: 0, max: 100 },
          curl: { value: defaultShaderOptions.curl, min: 0.01, max: 5 },
          chaos: { value: defaultShaderOptions.chaos, min: 1, max: 5, step: 1 },
          alpha: { value: defaultShaderOptions.alpha, min: 0, max: 1 },
          gain: { value: defaultShaderOptions.gain, min: 0, max: 1 },
        },
      ),
    [],
  );
  useEffect(() => {
    setProps(shaderPresets[preset]);
  }, [preset]);

  const { getAverage } = useAudioStream(audio);

  return (
    <div className='flex grow items-center justify-center'>
      <div className='z-[10] absolute right-2 bottom-2'>
        <Button onClick={() => console.log(JSON.stringify(options, null, 2))}>Snapshot</Button>
      </div>
      <Chaos {...props} options={options} getValue={getAverage} />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-sfx/Chaos',
  component: Chaos,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Chaos>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    active: true,
    debug: true,
    classNames: 'is-[256px] bs-[256px]',
  },
};

export const Large: Story = {
  args: {
    active: true,
    classNames: 'is-[512px] bs-[512px]',
  },
};
