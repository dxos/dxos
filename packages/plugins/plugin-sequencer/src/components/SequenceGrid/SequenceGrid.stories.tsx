//
// Copyright 2026 DXOS.org
//

import { RegistryContext, Registry } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import type { Note, Sequence, Track } from '#types';

import { SequenceGrid } from './SequenceGrid';

const SEQUENCE_LENGTH = 16; // beats
const BEATS_PER_CELL = 0.25;

const sampleTrack: Track.Track = {
  id: 'track-1',
  name: 'Lead Synth',
  hue: 'blue',
};

const sampleNotes = (): Note.Note[] => {
  const notes: Note.Note[] = [];
  // A simple ascending C-major pattern.
  const cMajor = [60, 62, 64, 65, 67, 69, 71, 72];
  for (let i = 0; i < 16; i++) {
    notes.push({
      pitch: cMajor[i % cMajor.length],
      startTime: i * 0.5,
      duration: 0.25,
      velocity: 0.6 + (i % 4) * 0.1,
    });
  }
  return notes;
};

type StoryProps = {
  playback: boolean;
};

const DefaultStory = ({ playback }: StoryProps) => {
  const [sequence, setSequence] = useState<Sequence.Sequence>(() => ({
    id: 'seq-1',
    trackId: sampleTrack.id,
    name: 'Verse',
    length: SEQUENCE_LENGTH,
    notes: sampleNotes(),
  }));

  // Playhead loop.
  const [playhead, setPlayhead] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playback) {
      setPlayhead(null);
      return;
    }
    const start = performance.now();
    const tempo = 120; // BPM
    const beatsPerSecond = tempo / 60;
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      setPlayhead((elapsed * beatsPerSecond) % SEQUENCE_LENGTH);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [playback]);

  const handleToggleNote = (pitch: number, startTime: number, mode: 'set' | 'unset' | 'toggle') => {
    setSequence((current) => {
      const existing = current.notes.find(
        (note) => note.pitch === pitch && Math.abs(note.startTime - startTime) < 1e-6,
      );
      const exists = existing !== undefined;
      const shouldRemove = mode === 'unset' || (mode === 'toggle' && exists);
      const shouldAdd = mode === 'set' || (mode === 'toggle' && !exists);
      if (shouldRemove && exists) {
        return { ...current, notes: current.notes.filter((note) => note !== existing) };
      }
      if (shouldAdd && !exists) {
        return {
          ...current,
          notes: [...current.notes, { pitch, startTime, duration: BEATS_PER_CELL, velocity: 0.8 }],
        };
      }
      return current;
    });
  };

  return (
    <div className='absolute inset-0'>
      <SequenceGrid
        sequence={sequence}
        track={sampleTrack}
        beatsPerCell={BEATS_PER_CELL}
        playhead={playhead}
        onToggleNote={handleToggleNote}
      />
    </div>
  );
};

const RegistryWrapper = ({ children }: { children: React.ReactNode }) => {
  const [registry] = useState(() => Registry.make());
  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-sequencer/components/SequenceGrid',
  component: DefaultStory,
  render: (args) => (
    <RegistryWrapper>
      <DefaultStory {...args} />
    </RegistryWrapper>
  ),
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    playback: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Playing: Story = { args: { playback: true } };
export const Stopped: Story = { args: { playback: false } };
