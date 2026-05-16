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
import { formatLeadSheet, parseLeadSheet, type LeadSheetDocument } from '../../util/lead-sheet';

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

const toNoteArray = (value: unknown): ReadonlyArray<Note.Note> => {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value as ReadonlyArray<Note.Note>;
  }
  return Array.from(value as ArrayLike<Note.Note>);
};

const parseTimeSignature = (input: string | undefined): number => {
  if (!input) {
    return 4;
  }
  const match = /^(\d+)\s*\/\s*\d+$/.exec(input.trim());
  return match ? Number(match[1]) : 4;
};

/**
 * Project a Song into the LeadSheetDocument shape. Each track becomes one section;
 * notes come from the first sequence associated with that track (multi-sequence
 * export is out of scope for v1).
 */
const songToLeadSheet = (song: Song.Song): LeadSheetDocument => ({
  tracks: song.tracks.map((track, index) => {
    const sequence = song.sequences.find((seq) => seq.trackId === track.id);
    return {
      index: index + 1,
      name: track.name,
      instrument: track.instrument,
      notes: sequence ? toNoteArray(sequence.notes).map((note) => ({ ...note })) : [],
      length: sequence?.length ?? 16,
    };
  }),
});

/**
 * Replace a Song's tracks/sequences with the contents of a LeadSheetDocument.
 * Tracks are matched by 1-based index — existing tracks at that index are reused
 * (preserving color/instrument/id) and new tracks fill missing slots. Tracks not
 * referenced by the document are removed.
 */
const applyLeadSheetToSong = (mutable: MutableSong, document: LeadSheetDocument): void => {
  const TRACK_COLORS_FALLBACK = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899',
  ];
  const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const sorted = [...document.tracks].sort((a, b) => a.index - b.index);
  const existingByIndex = new Map(mutable.tracks.map((track, i) => [i + 1, track]));

  // Clear in place; ECHO array mutations stick to the same proxy reference.
  mutable.tracks.splice(0, mutable.tracks.length);
  mutable.sequences.splice(0, mutable.sequences.length);

  sorted.forEach((entry, slot) => {
    const previous = existingByIndex.get(entry.index);
    const trackId = previous?.id ?? newId();
    const color = previous?.color ?? TRACK_COLORS_FALLBACK[slot % TRACK_COLORS_FALLBACK.length];
    mutable.tracks.push({
      id: trackId,
      name: entry.name,
      color,
      instrument: entry.instrument ?? previous?.instrument,
      minPitch: previous?.minPitch,
      maxPitch: previous?.maxPitch,
      muted: previous?.muted,
    });
    mutable.sequences.push({
      id: newId(),
      trackId,
      name: entry.name,
      length: entry.length,
      notes: entry.notes.map((note) => ({ ...note })),
    });
  });
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
      mutable.sequences.push(newSequence(activeTrack.id));
    });
  }, [subject, activeTrack, activeSequence]);

  const handleAddTrack = useCallback(() => {
    Obj.update(subject, (subject) => {
      const mutable = subject as unknown as MutableSong;
      const track = newTrack(mutable.tracks.length);
      mutable.tracks.push(track);
      mutable.sequences.push(newSequence(track.id));
    });
  }, [subject]);

  const handleRemoveTrack = useCallback(
    (trackId: string) => {
      Obj.update(subject, (subject) => {
        const mutable = subject as unknown as MutableSong;
        for (let i = mutable.tracks.length - 1; i >= 0; i--) {
          if (mutable.tracks[i].id === trackId) {
            mutable.tracks.splice(i, 1);
          }
        }
        for (let i = mutable.sequences.length - 1; i >= 0; i--) {
          if (mutable.sequences[i].trackId === trackId) {
            mutable.sequences.splice(i, 1);
          }
        }
      });
    },
    [subject],
  );

  const handleMuteTrack = useCallback(
    (trackId: string, muted: boolean) => {
      Obj.update(subject, (subject) => {
        const mutable = subject as unknown as MutableSong;
        const track = mutable.tracks.find((track) => track.id === trackId);
        if (track) {
          track.muted = muted;
        }
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

  const beatsPerBar = parseTimeSignature(song.timeSignature);

  const handleExport = useCallback(async () => {
    const document = songToLeadSheet(song);
    const text = formatLeadSheet(document, { beatsPerBar });
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API unavailable (e.g. insecure context); fall back to console + alert.
      // eslint-disable-next-line no-console
      console.log(text);
      window.alert('Lead sheet copied to console (clipboard unavailable):\n\n' + text);
    }
  }, [song, beatsPerBar]);

  const handleImport = useCallback(async () => {
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      const fallback = window.prompt('Paste lead sheet:');
      if (fallback === null) {
        return;
      }
      text = fallback;
    }
    if (!text.trim()) {
      return;
    }
    let document: LeadSheetDocument;
    try {
      document = parseLeadSheet(text, { beatsPerBar });
    } catch (error) {
      window.alert(`Lead-sheet parse error: ${(error as Error).message}`);
      return;
    }
    Obj.update(subject, (subject) => {
      const mutable = subject as unknown as MutableSong;
      applyLeadSheetToSong(mutable, document);
    });
  }, [subject, beatsPerBar]);

  const beatsPerCell = 0.25;

  const handleToggleNote = useCallback(
    (pitch: number, startTime: number) => {
      if (!activeSequence) {
        return;
      }
      const sequenceId = activeSequence.id;
      Obj.update(subject, (subject) => {
        const mutable = subject as unknown as MutableSong;
        const sequence = mutable.sequences.find((seq) => seq.id === sequenceId);
        if (!sequence) {
          return;
        }
        const existingIndex = sequence.notes.findIndex(
          (note) => note.pitch === pitch && Math.abs(note.startTime - startTime) < 1e-6,
        );
        if (existingIndex >= 0) {
          sequence.notes.splice(existingIndex, 1);
        } else {
          sequence.notes.push({ pitch, startTime, duration: beatsPerCell, velocity: 0.8 });
        }
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
          <Toolbar.Separator />
          <Toolbar.IconButton
            icon='ph--upload-simple--regular'
            label='Import lead sheet'
            onClick={handleImport}
          />
          <Toolbar.IconButton
            icon='ph--download-simple--regular'
            label='Export lead sheet'
            onClick={handleExport}
          />
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
