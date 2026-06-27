//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type Track } from '#types';

import { TrackList } from './TrackList';

const tracks: Track.Track[] = [
  { id: 'drums', name: 'Drums', hue: 'red' },
  { id: 'bass', name: 'Bass', hue: 'amber' },
  { id: 'keys', name: 'Keys', hue: 'sky' },
  { id: 'lead', name: 'Lead synth with a long name that should truncate', hue: 'fuchsia' },
];

const meta = {
  title: 'plugins/plugin-sequencer/TrackList',
  component: TrackList,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof TrackList>;

export default meta;

type Story = StoryObj<typeof TrackList>;

/** Interactive: click to select (Listbox single-select), toggle mute, add/remove. */
export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState<string | undefined>('drums');
    const [muted, setMuted] = useState<Record<string, boolean>>({ bass: true });
    return (
      <TrackList
        classNames='w-64'
        tracks={tracks.map((track) => ({ ...track, muted: muted[track.id] ?? false }))}
        selectedTrackId={selected}
        onSelect={setSelected}
        onMute={(id, value) => setMuted((prev) => ({ ...prev, [id]: value }))}
        onAdd={() => {}}
        onRemove={() => {}}
      />
    );
  },
};
