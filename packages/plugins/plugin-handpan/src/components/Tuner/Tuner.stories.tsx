//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Tuner } from './Tuner.tsx';

const meta = {
  title: 'plugins/plugin-handpan/components/Tuner',
  component: Tuner,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof Tuner>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Strike each note of the selected scale in turn (ding first); requires a microphone. */
export const Calibrate: Story = {
  args: {
    source: 'microphone',
    defaultMode: 'calibrate',
    persist: true,
  },
};

/** Shows the note being played on the instrument; requires a microphone. */
export const Live: Story = {
  args: {
    source: 'microphone',
    defaultMode: 'live',
    persist: true,
  },
};

/** Calibration driven by synthesized handpan tones: start, then click the highlighted pad. */
export const SimulatedCalibrate: Story = {
  args: {
    source: 'synth',
    defaultMode: 'calibrate',
  },
};

/** Live detection of synthesized tones: start, then click any pad (or Tak). */
export const SimulatedLive: Story = {
  args: {
    source: 'synth',
    defaultMode: 'live',
  },
};

/**
 * Synthesized session (real clicks required: browsers start audio only on a genuine gesture).
 * 1. Press Start; the status reads "Play note D (D3)".
 * 2. Click each highlighted pad in turn; the status reads "Calibration complete".
 * 3. Switch to Live and click pads 3, 1, 5 then Tak; the history ends `3 1 5 T`.
 */
export const SimulatedSession: Story = {
  args: {
    source: 'synth',
    defaultMode: 'calibrate',
    strikes: 1,
    synthDetune: 0,
  },
};
