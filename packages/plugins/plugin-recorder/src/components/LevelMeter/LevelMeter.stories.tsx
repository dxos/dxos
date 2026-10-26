//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { expect, within } from 'storybook/test';

import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { initialMeterState, nextMeterState } from '../../audio/level.ts';
import { LevelMeter } from './LevelMeter.tsx';

/** A synthetic voice: bursts of a tone whose loudness wanders through the target band. */
const SpeakingStory = () => {
  const [state, setState] = useState(() => initialMeterState(performance.now()));
  useEffect(() => {
    let current = initialMeterState(performance.now());
    const samples = new Float32Array(1024);
    const interval = setInterval(() => {
      const now = performance.now();
      const amplitude = Math.abs(Math.sin(now / 700)) * 0.6 * (Math.sin(now / 90) > -0.3 ? 1 : 0.05);
      samples.forEach((_, index) => (samples[index] = amplitude * Math.sin(index / 3)));
      current = nextMeterState(current, samples, now);
      setState(current);
    }, 33);
    return () => clearInterval(interval);
  }, []);
  return <LevelMeter {...state} />;
};

const meta = {
  title: 'plugins/plugin-recorder/components/LevelMeter',
  component: LevelMeter,
  decorators: [withTheme()],
  parameters: { layout: 'centered', translations },
} satisfies Meta<typeof LevelMeter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { peakDb: -14, holdDb: -8, rmsDb: -24 },
};

export const Speaking: Story = {
  render: () => <SpeakingStory />,
};

export const Compact: Story = {
  args: { peakDb: -14, holdDb: -8, rmsDb: -24, compact: true },
};

export const NoInput: Story = {
  args: {},
};

export const Clipping: Story = {
  args: { peakDb: -0.5, holdDb: -0.2, rmsDb: -6, clip: true },
};

export const NoSignal: Story = {
  args: { peakDb: -120, holdDb: -120, rmsDb: -120, silent: true },
};

export const Test: Story = {
  render: () => (
    <div className='flex flex-col gap-4'>
      <div data-testid='clipping'>
        <LevelMeter peakDb={-0.5} holdDb={-0.2} rmsDb={-6} clip />
      </div>
      <div data-testid='silent'>
        <LevelMeter peakDb={-120} holdDb={-120} rmsDb={-120} silent />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. A peak above -1 dBFS reads CLIP.
    await expect(within(canvas.getByTestId('clipping')).getByTestId('recorder.level-meter.readout')).toHaveTextContent(
      'CLIP',
    );
    // 2. A silent input reads NO SIGNAL.
    await expect(within(canvas.getByTestId('silent')).getByTestId('recorder.level-meter.readout')).toHaveTextContent(
      'NO SIGNAL',
    );
  },
};
