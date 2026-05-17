//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Button, Dialog, Icon, Input, Panel } from '@dxos/react-ui';
import { type ToggleMode } from '@dxos/react-ui-canvas';
import { Menu, MenuBuilder, useMenuActions, type ActionGraphProps } from '@dxos/react-ui-menu';
import { mx } from '@dxos/ui-theme';

import { SongPlayer } from '../../audio';
import { SequenceGrid, TrackList } from '#components';
import type { Note, Sequence, Song, Track } from '#types';

import { formatLeadSheet, parseLeadSheet, type LeadSheetDocument } from '../../util/lead-sheet';

export type SongArticleProps = AppSurface.ObjectArticleProps<Song.Song>;

type MutableSong = {
  name?: string;
  tempo: number;
  timeSignature?: string;
  tracks: (Track.Track & { patches?: Track.Track['patches'] })[];
  sequences: {
    id: string;
    trackId: string;
    name?: string;
    length: number;
    notes: Note.Note[];
  }[];
};

const TRACK_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Default visible pitch range: C1 (MIDI 24) through C5 (MIDI 72) inclusive.
// Spans 5 octaves of C (C1..C5) — a comfortable piano-roll range that covers
// bass through lead in standard tunings.
const DEFAULT_MIN_PITCH = 24;
const DEFAULT_MAX_PITCH = 72;

const newTrack = (index: number): Track.Track => ({
  id: newId(),
  name: `Track ${index + 1}`,
  color: TRACK_COLORS[index % TRACK_COLORS.length],
  minPitch: DEFAULT_MIN_PITCH,
  maxPitch: DEFAULT_MAX_PITCH,
  patches: [
    {
      kind: 'synth',
      minPitch: DEFAULT_MIN_PITCH,
      maxPitch: DEFAULT_MAX_PITCH,
      oscillator: index % 2 === 0 ? 'sine' : 'triangle',
    },
  ],
});

// Standard kit mapping shared with the lead-sheet importer.
const DRUM_KIT_PATCHES: Track.Track['patches'] = [
  { kind: 'drum', pitch: 36, drum: 'kick' },
  { kind: 'drum', pitch: 38, drum: 'snare' },
  { kind: 'drum', pitch: 39, drum: 'clap' },
  { kind: 'drum', pitch: 41, drum: 'tomLo' },
  { kind: 'drum', pitch: 42, drum: 'hat' },
  { kind: 'drum', pitch: 46, drum: 'openhat' },
  { kind: 'drum', pitch: 47, drum: 'tomMid' },
  { kind: 'drum', pitch: 49, drum: 'crash' },
  { kind: 'drum', pitch: 50, drum: 'tomHi' },
  { kind: 'drum', pitch: 51, drum: 'ride' },
];

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
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#06b6d4',
    '#3b82f6',
    '#a855f7',
    '#ec4899',
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
    const instrument = entry.instrument ?? previous?.instrument;
    const patches = previous?.patches
      ? Array.from(previous.patches)
      : instrument === 'drums'
        ? DRUM_KIT_PATCHES.map((patch) => ({ ...patch }))
        : [
            {
              kind: 'synth' as const,
              minPitch: previous?.minPitch ?? DEFAULT_MIN_PITCH,
              maxPitch: previous?.maxPitch ?? DEFAULT_MAX_PITCH,
              oscillator: 'sine' as const,
            },
          ];
    mutable.tracks.push({
      id: trackId,
      name: entry.name,
      color,
      instrument,
      minPitch: previous?.minPitch,
      maxPitch: previous?.maxPitch,
      muted: previous?.muted,
      patches,
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
export const SongArticle = ({ role, subject, attendableId }: SongArticleProps) => {
  const [snapshot] = useObject(subject);
  const song = snapshot as unknown as Song.Song;

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [leadSheetDialog, setLeadSheetDialog] = useState<{ mode: 'import' | 'export'; text: string } | null>(null);

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
    let createdTrackId: string | null = null;
    Obj.update(subject, (subject) => {
      const mutable = subject as unknown as MutableSong;
      const track = newTrack(mutable.tracks.length);
      createdTrackId = track.id;
      mutable.tracks.push(track);
      mutable.sequences.push(newSequence(track.id));
    });
    if (createdTrackId) {
      setSelectedTrackId(createdTrackId);
    }
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

  const handleExport = useCallback(() => {
    const document = songToLeadSheet(song);
    const text = formatLeadSheet(document, { beatsPerBar });
    setLeadSheetDialog({ mode: 'export', text });
  }, [song, beatsPerBar]);

  const handleImport = useCallback(async () => {
    let initial = '';
    try {
      initial = await navigator.clipboard.readText();
    } catch {
      // Clipboard read can fail in insecure contexts or without focus; that's fine,
      // the dialog still opens with an empty textarea for the user to paste into.
    }
    setLeadSheetDialog({ mode: 'import', text: initial });
  }, []);

  const handleImportApply = useCallback(
    (text: string): string | null => {
      if (!text.trim()) {
        return 'Lead sheet is empty.';
      }
      let document: LeadSheetDocument;
      try {
        document = parseLeadSheet(text, { beatsPerBar });
      } catch (error) {
        return (error as Error).message;
      }
      Obj.update(subject, (subject) => {
        const mutable = subject as unknown as MutableSong;
        applyLeadSheetToSong(mutable, document);
      });
      return null;
    },
    [subject, beatsPerBar],
  );

  const beatsPerCell = 0.25;

  const handleToggleNote = useCallback(
    (pitch: number, startTime: number, mode: ToggleMode) => {
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
        const exists = existingIndex >= 0;
        const shouldRemove = mode === 'unset' || (mode === 'toggle' && exists);
        const shouldAdd = mode === 'set' || (mode === 'toggle' && !exists);
        if (shouldRemove && exists) {
          sequence.notes.splice(existingIndex, 1);
        } else if (shouldAdd && !exists) {
          sequence.notes.push({ pitch, startTime, duration: beatsPerCell, velocity: 0.8 });
        }
      });
    },
    [subject, activeSequence, beatsPerCell],
  );

  // Tone.js audio playback. The SongPlayer is rebuilt whenever the Song structure
  // changes; play/stop is driven by isPlaying. The playhead animation runs in
  // parallel via rAF — visually accurate within a few ms of the audio.
  const playerRef = useRef<SongPlayer | null>(null);
  if (playerRef.current === null) {
    playerRef.current = new SongPlayer();
  }

  useEffect(() => {
    const player = playerRef.current!;
    return () => player.dispose();
  }, []);

  useEffect(() => {
    const player = playerRef.current!;
    player.load(song as Song.Song);
  }, [song]);

  useEffect(() => {
    const player = playerRef.current!;
    if (!isPlaying || !activeSequence) {
      player.stop();
      setPlayhead(null);
      return;
    }
    void player.play();
    const startedAt = performance.now();
    const beatsPerSecond = song.tempo / 60;
    let raf = 0;
    const tick = (now: number) => {
      const elapsedSeconds = (now - startedAt) / 1000;
      const beats = (elapsedSeconds * beatsPerSecond) % activeSequence.length;
      setPlayhead(beats);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      player.stop();
    };
  }, [isPlaying, activeSequence, song.tempo]);

  // Toolbar actions composed via the MenuBuilder / Menu.Root idiom
  // (org.dxos.react-ui-menu.toolbarMenu). useMemo deps cover every value the
  // menu's invoke handlers close over so the actions stay in sync.
  const togglePlay = useCallback(() => setIsPlaying((current) => !current), []);
  const actionsAtom = useMemo(
    () =>
      Atom.make(
        (): ActionGraphProps =>
          MenuBuilder.make()
            .action(
              'play',
              {
                label: isPlaying ? 'Stop' : 'Play',
                icon: isPlaying ? 'ph--pause--regular' : 'ph--play--regular',
                iconOnly: true,
                disposition: 'toolbar',
              },
              togglePlay,
            )
            .separator()
            .action(
              'import',
              {
                label: 'Import lead sheet',
                icon: 'ph--upload-simple--regular',
                iconOnly: true,
                disposition: 'toolbar',
              },
              handleImport,
            )
            .action(
              'export',
              {
                label: 'Export lead sheet',
                icon: 'ph--download-simple--regular',
                iconOnly: true,
                disposition: 'toolbar',
              },
              handleExport,
            )
            .build(),
      ),
    [isPlaying, togglePlay, handleImport, handleExport],
  );
  const menuActions = useMenuActions(actionsAtom);

  return (
    <Panel.Root role={role}>
      <Menu.Root {...menuActions} attendableId={attendableId}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar>
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
          </Menu.Toolbar>
        </Panel.Toolbar>
      </Menu.Root>
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
      {leadSheetDialog && (
        <LeadSheetDialog
          mode={leadSheetDialog.mode}
          initialText={leadSheetDialog.text}
          onApply={handleImportApply}
          onClose={() => setLeadSheetDialog(null)}
        />
      )}
    </Panel.Root>
  );
};

type LeadSheetDialogProps = {
  mode: 'import' | 'export';
  initialText: string;
  onApply: (text: string) => string | null;
  onClose: () => void;
};

const LeadSheetDialog = ({ mode, initialText, onApply, onClose }: LeadSheetDialogProps) => {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError('Clipboard unavailable — select all and copy manually.');
    }
  }, [text]);

  const handleConfirm = useCallback(() => {
    if (mode === 'import') {
      const message = onApply(text);
      if (message) {
        setError(message);
        return;
      }
    }
    onClose();
  }, [mode, text, onApply, onClose]);

  return (
    <Dialog.Root defaultOpen modal onOpenChange={(open) => !open && onClose()}>
      <Dialog.Overlay>
        <Dialog.Content size='lg'>
          <Dialog.Header>
            <Dialog.Title>{mode === 'export' ? 'Export lead sheet' : 'Import lead sheet'}</Dialog.Title>
            <Dialog.Close asChild>
              <Dialog.CloseIconButton />
            </Dialog.Close>
          </Dialog.Header>
          <Dialog.Body>
            <textarea
              autoFocus
              value={text}
              readOnly={mode === 'export'}
              spellCheck={false}
              onChange={(event) => {
                setText(event.target.value);
                setError(null);
              }}
              className={mx(
                'w-full min-h-[16rem] font-mono text-xs p-2 rounded bg-input',
                'border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-primary-500',
              )}
              placeholder={mode === 'import' ? 'Paste lead-sheet text here…' : ''}
            />
            {error && <div className='text-xs text-red-500 mt-2'>{error}</div>}
            {copied && <div className='text-xs text-green-500 mt-2'>Copied to clipboard.</div>}
          </Dialog.Body>
          <Dialog.ActionBar>
            {mode === 'export' && (
              <Button onClick={handleCopy} variant='primary'>
                Copy to clipboard
              </Button>
            )}
            {mode === 'import' && (
              <Button onClick={handleConfirm} variant='primary'>
                Import
              </Button>
            )}
            <Dialog.Close asChild>
              <Button>Close</Button>
            </Dialog.Close>
          </Dialog.ActionBar>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

export default SongArticle;
