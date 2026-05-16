//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Button, Icon, Input, Panel, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { SequenceGrid, TrackList } from '#components';
import type { Note, Sequence, Song, Track } from '#types';

export type SongArticleProps = AppSurface.ObjectArticleProps<Song.Song>;

type MutableSong = {
  name?: string;
  tempo: number;
  timeSignature?: string;
  tracks: Track.Track[];
  sequences: {
    id: string;
    trackId: string;
    name?: string;
    length: number;
    notes: Note.Note[];
  }[];
};

const TRACK_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899',
];

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const newTrack = (index: number): Track.Track => ({
  id: newId(),
  name: `Track ${index + 1}`,
  color: TRACK_COLORS[index % TRACK_COLORS.length],
  minPitch: 48,
  maxPitch: 84,
});

type MutableSequence = MutableSong['sequences'][number];

const newSequence = (trackId: string): MutableSequence => ({
  id: newId(),
  trackId,
  length: 16,
  notes: [],
});

const findSequenceForTrack = (song: Song.Song, trackId: string | null): Sequence.Sequence | undefined => {
  if (!trackId) {
    return undefined;
  }
  return song.sequences.find((sequence) => sequence.trackId === trackId);
};

/**
 * Article surface for a Song. Composes a TrackList (left) with the active Sequence's
 * piano-roll grid (right) and a toolbar with playback + tempo controls.
 */
export const SongArticle = ({ role, subject, attendableId: _attendableId }: SongArticleProps) => {
  const [snapshot] = useObject(subject);
  const song = snapshot as unknown as Song.Song;

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState<number | null>(null);

  // Auto-select the first track when one becomes available.
  useEffect(() => {
    if (!selectedTrackId && song.tracks.length > 0) {
      setSelectedTrackId(song.tracks[0].id);
    } else if (selectedTrackId && !song.tracks.some((track) => track.id === selectedTrackId)) {
      setSelectedTrackId(song.tracks[0]?.id ?? null);
    }
  }, [selectedTrackId, song.tracks]);

  const activeTrack = song.tracks.find((track) => track.id === selectedTrackId) ?? null;
  const activeSequence = findSequenceForTrack(song, selectedTrackId) ?? null;

  // Ensure a sequence exists for the selected track.
  useEffect(() => {
    if (!activeTrack || activeSequence) {
      return;
    }
    Obj.update(subject, (subject) => {
      const mutable = subject as unknown as MutableSong;
      mutable.sequences = [...mutable.sequences, newSequence(activeTrack.id)];
    });
  }, [subject, activeTrack, activeSequence]);

  const handleAddTrack = useCallback(() => {
    Obj.update(subject, (subject) => {
      const mutable = subject as unknown as MutableSong;
      const track = newTrack(mutable.tracks.length);
      mutable.tracks = [...mutable.tracks, track];
      mutable.sequences = [...mutable.sequences, newSequence(track.id)];
    });
  }, [subject]);

  const handleRemoveTrack = useCallback(
    (trackId: string) => {
      Obj.update(subject, (subject) => {
        const mutable = subject as unknown as MutableSong;
        mutable.tracks = mutable.tracks.filter((track) => track.id !== trackId);
        mutable.sequences = mutable.sequences.filter((sequence) => sequence.trackId !== trackId);
      });
    },
    [subject],
  );

  const handleMuteTrack = useCallback(
    (trackId: string, muted: boolean) => {
      Obj.update(subject, (subject) => {
        const mutable = subject as unknown as MutableSong;
        mutable.tracks = mutable.tracks.map((track) => (track.id === trackId ? { ...track, muted } : track));
      });
    },
    [subject],
  );

  const handleTempoChange = useCallback(
    (next: number) => {
      if (!Number.isFinite(next) || next < 1) {
        return;
      }
      Obj.update(subject, (subject) => {
        const mutable = subject as unknown as MutableSong;
        mutable.tempo = next;
      });
    },
    [subject],
  );

  const beatsPerCell = 0.25;

  const handleToggleNote = useCallback(
    (pitch: number, startTime: number) => {
      if (!activeSequence) {
        return;
      }
      const sequenceId = activeSequence.id;
      Obj.update(subject, (subject) => {
        const mutable = subject as unknown as MutableSong;
        mutable.sequences = mutable.sequences.map((sequence) => {
          if (sequence.id !== sequenceId) {
            return sequence;
          }
          const existing = sequence.notes.find(
            (note) => note.pitch === pitch && Math.abs(note.startTime - startTime) < 1e-6,
          );
          const notes = existing
            ? sequence.notes.filter((note) => note !== existing)
            : [...sequence.notes, { pitch, startTime, duration: beatsPerCell, velocity: 0.8 } satisfies Note.Note];
          return { ...sequence, notes };
        });
      });
    },
    [subject, activeSequence, beatsPerCell],
  );

  // Playhead animation loop: advance in beats relative to wall-clock time + tempo.
  const startedAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isPlaying || !activeSequence) {
      startedAtRef.current = null;
      setPlayhead(null);
      return;
    }
    const startedAt = performance.now();
    startedAtRef.current = startedAt;
    const beatsPerSecond = song.tempo / 60;
    let raf = 0;
    const tick = (now: number) => {
      const elapsedSeconds = (now - startedAt) / 1000;
      const beats = (elapsedSeconds * beatsPerSecond) % activeSequence.length;
      setPlayhead(beats);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, activeSequence, song.tempo]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.IconButton
            icon={isPlaying ? 'ph--pause--regular' : 'ph--play--regular'}
            label={isPlaying ? 'Stop' : 'Play'}
            onClick={() => setIsPlaying((current) => !current)}
          />
          <Toolbar.Separator />
          <Input.Root>
            <Input.Label classNames='text-xs mr-1'>BPM</Input.Label>
            <Input.TextInput
              type='number'
              min={1}
              value={song.tempo}
              onChange={(event) => handleTempoChange(Number(event.target.value))}
              classNames='w-16'
            />
          </Input.Root>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <div className='flex h-full min-h-0'>
          <div className='w-48 shrink-0 border-r border-neutral-200 dark:border-neutral-800'>
            <TrackList
              tracks={song.tracks}
              selectedTrackId={selectedTrackId}
              onSelect={setSelectedTrackId}
              onMute={handleMuteTrack}
              onAdd={handleAddTrack}
              onRemove={handleRemoveTrack}
            />
          </div>
          <div className='flex-1 min-w-0 relative'>
            {activeTrack && activeSequence ? (
              <SequenceGrid
                sequence={activeSequence}
                track={activeTrack}
                beatsPerCell={beatsPerCell}
                playhead={playhead}
                onToggleNote={handleToggleNote}
              />
            ) : (
              <div className={mx('absolute inset-0 flex items-center justify-center text-neutral-500 text-sm')}>
                <div className='flex flex-col items-center gap-2'>
                  <Icon icon='ph--music-notes--regular' size={6} />
                  <span>Add a track to begin.</span>
                  <Button onClick={handleAddTrack}>Add track</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

export default SongArticle;
