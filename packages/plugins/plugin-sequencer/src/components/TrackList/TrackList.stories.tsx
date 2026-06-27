//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type Track } from '#types';

import { TrackList } from './TrackList';

const initialTracks: Track.Track[] = [
  { id: 'drums', name: 'Drums', hue: 'red', muted: false },
  { id: 'bass', name: 'Bass', hue: 'amber', muted: true },
  { id: 'keys', name: 'Keys', hue: 'sky', muted: false },
  { id: 'lead', name: 'Lead synth with a long name that should truncate', hue: 'fuchsia', muted: false },
];

const hues = ['red', 'amber', 'sky', 'fuchsia', 'green', 'violet'];

const meta = {
  title: 'plugins/plugin-sequencer/TrackList',
  component: TrackList,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof TrackList>;

export default meta;

type Story = StoryObj<typeof TrackList>;

/** Interactive: click a name to select (active row highlighted), toggle mute, add/remove. */
export const Default: Story = {
  render: () => {
    const [tracks, setTracks] = useState<Track.Track[]>(initialTracks);
    const [selected, setSelected] = useState<string | undefined>('drums');
    const nextId = useRef(1);
    return (
      <TrackList
        classNames='w-64'
        tracks={tracks}
        selectedTrackId={selected}
        onSelect={setSelected}
        onMute={(id, muted) =>
          setTracks((prev) => prev.map((track) => (track.id === id ? { ...track, muted } : track)))
        }
        onAdd={() =>
          setTracks((prev) => {
            const id = `track-${nextId.current++}`;
            return [
              ...prev,
              { id, name: `Track ${prev.length + 1}`, hue: hues[prev.length % hues.length], muted: false },
            ];
          })
        }
        onRemove={(id) =>
          setTracks((prev) => {
            setSelected((current) => (current === id ? undefined : current));
            return prev.filter((track) => track.id !== id);
          })
        }
      />
    );
  },
};
