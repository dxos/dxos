//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { levaStore, useControls } from 'leva';
import React, { useEffect } from 'react';

import { useAudioStream } from '@dxos/react-ui-audio';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { applyValues, levaControls, levaPaths, toConfig } from '../Avatar/stories/tuner.ts';
import { kube } from '../Avatar/visualizations/kube.ts';
import { defaultKubeOptions } from './kube-presets.ts';
import { Kube, type KubeProps } from './Kube.tsx';

type StoryProps = KubeProps & {
  /** Drives the particles from the microphone. */
  microphone?: boolean;
};

const FOLDER = 'Kube';

const DefaultStory = ({ microphone = false, ...props }: StoryProps) => {
  const values = toConfig(useControls(FOLDER, levaControls(kube.params, defaultKubeOptions)));
  // Leva's store outlives a story, so each story writes its own starting values rather than inheriting the last one's.
  useEffect(() => levaStore.set(levaPaths(FOLDER, defaultKubeOptions), false), []);
  const { getAverage } = useAudioStream(microphone);

  return (
    <Kube {...props} options={applyValues(defaultKubeOptions, values)} getValue={microphone ? getAverage : undefined} />
  );
};

const meta = {
  title: 'ui/react-ui-experimental/Kube',
  component: Kube,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<StoryProps>;

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {};

export const Microphone: Story = {
  args: {
    microphone: true,
  },
};
