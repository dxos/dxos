//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type SlideTakesItem, SlideTakesList } from './SlideTakesList.tsx';

const slides: SlideTakesItem[] = [
  { id: 'a', title: 'The Silo Problem', takes: 3, duration: 14.4, desired: 15 },
  { id: 'b', title: 'Monolithic Agents', takes: 1, duration: 13.2, desired: 12 },
  { id: 'c', title: 'ECHO Graph Database', takes: 0, desired: 20 },
  { id: 'd', title: 'Open and Extensible', takes: 2, duration: 16.9 },
];

const DefaultStory = () => {
  const [playing, setPlaying] = useState<string>();
  return (
    <SlideTakesList
      slides={slides}
      playing={playing}
      onPlay={(id) => setPlaying((playing) => (playing === id ? undefined : id))}
    />
  );
};

const meta = {
  title: 'plugins/plugin-recorder/components/SlideTakesList',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[28rem] p-4' })],
  parameters: { translations },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rows = canvas.getAllByTestId('recorder.slide');
    // 1. Every slide is listed, recorded or not.
    await expect(rows).toHaveLength(4);
    // 2. A slide with no take cannot be played.
    await expect(within(rows[2]).getByTestId('recorder.slide.play')).toBeDisabled();
  },
};
