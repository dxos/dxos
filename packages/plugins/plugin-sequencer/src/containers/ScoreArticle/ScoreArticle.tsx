//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Button, Icon, Input, Panel } from '@dxos/react-ui';
import { type ToggleMode } from '@dxos/react-ui-canvas';
import { Oscilloscope } from '@dxos/react-ui-components';
import { Menu, MenuBuilder, useMenuActions, type ActionGraphProps } from '@dxos/react-ui-menu';
import { mx } from '@dxos/ui-theme';

import { SequenceGrid, TrackList } from '#components';
import type { Sequence, Score, Track } from '#types';

import { ScorePlayer } from '../../audio';
import { formatLeadSheet, parseLeadSheet, type LeadSheetDocument } from '../../util/lead-sheet';
import { applyLeadSheetToScore, scoreToLeadSheet, type MutableScore } from '../../util/score-leadsheet';

export type ScoreArticleProps = AppSurface.ObjectArticleProps<Score.Score>;

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Default fallback pitch range for sound generators that need a definite
// span — the schema leaves track.minPitch / track.maxPitch optional, and the
// editor falls back to A0..C8 (full 88-key piano) when they're missing.
const DEFAULT_MIN_PITCH = 21;
const DEFAULT_MAX_PITCH = 108;

const newTrack = (index: number): Track.Track => ({
  id: newId(),
  name: `Track ${index + 1}`,
  // `hue` is intentionally left unset — TrackList / SequenceGrid resolve it
  // via `hueFor(track)`, which hashes the track id into a stable color when
  // no explicit hue is set.
  patches: [
    {
      kind: 'synth',
      minPitch: DEFAULT_MIN_PITCH,
      maxPitch: DEFAULT_MAX_PITCH,
      oscillator: index % 2 === 0 ? 'sine' : 'triangle',
    },
  ],
});

type MutableSequence = MutableScore['sequences'][number];

const newSequence = (trackId: string): MutableSequence => ({
  id: newId(),
  trackId,
  length: 16,
  notes: [],
});

const findSequenceForTrack = (score: Score.Score, trackId: string | null): Sequence.Sequence | undefined => {
  if (!trackId) {
    return undefined;
  }
  return score.sequences.find((sequence) => sequence.trackId === trackId);
};

const parseTimeSignature = (input: string | undefined): number => {
  if (!input) {
    return 4;
  }
  const match = /^(\d+)\s*\/\s*\d+$/.exec(input.trim());
  const beats = match ? Number(match[1]) : NaN;
  // Reject zero / negative / non-integer / non-finite — beatsPerBar=0 would break
  // every downstream position computation.
  return Number.isFinite(beats) && beats >= 1 ? Math.floor(beats) : 4;
};

/**
 * Article surface for a Score. Composes a TrackList (left) with the active Sequence's
 * piano-roll grid (right) and a toolbar with playback + tempo controls.
 */
export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticleProps) => {
  const [snapshot] = useObject(subject);
  const score = snapshot as unknown as Score.Score;

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [showAllTracks, setShowAllTracks] = useState(false);

  // Auto-select the first track when one becomes available.
  useEffect(() => {
    if (!selectedTrackId && score.tracks.length > 0) {
      setSelectedTrackId(score.tracks[0].id);
    } else if (selectedTrackId && !score.tracks.some((track) => track.id === selectedTrackId)) {
      setSelectedTrackId(score.tracks[0]?.id ?? null);
    }
  }, [selectedTrackId, score.tracks]);

  const activeTrack = score.tracks.find((track) => track.id === selectedTrackId) ?? null;
  const activeSequence = findSequenceForTrack(score, selectedTrackId) ?? null;

  // Ensure a sequence exists for the selected track.
  useEffect(() => {
    if (!activeTrack || activeSequence) {
      return;
    }
    Obj.update(subject, (subject) => {
      const mutable = subject as unknown as MutableScore;
      mutable.sequences.push(newSequence(activeTrack.id));
    });
  }, [subject, activeTrack, activeSequence]);

  const handleAddTrack = useCallback(() => {
    let createdTrackId: string | null = null;
    Obj.update(subject, (subject) => {
      const mutable = subject as unknown as MutableScore;
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
        const mutable = subject as unknown as MutableScore;
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
        const mutable = subject as unknown as MutableScore;
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
        const mutable = subject as unknown as MutableScore;
        mutable.tempo = next;
      });
    },
    [subject],
  );

  const handleLoopChange = useCallback(
    (loopStart: number, loopEnd: number) => {
      Obj.update(subject, (subject) => {
        const mutable = subject as unknown as MutableScore & { loopStart?: number; loopEnd?: number };
        mutable.loopStart = loopStart;
        mutable.loopEnd = loopEnd;
      });
    },
    [subject],
  );

  const beatsPerBar = parseTimeSignature(score.timeSignature);

  const handleExport = useCallback(() => {
    const document = scoreToLeadSheet(score);
    const text = formatLeadSheet(document, { beatsPerBar });
    const filename = `${(score.name ?? 'score').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60) || 'score'}.txt`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    window.document.body.appendChild(anchor);
    anchor.click();
    window.document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [score, beatsPerBar]);

  const handleImport = useCallback(() => {
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,text/plain';
    input.style.display = 'none';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      window.document.body.removeChild(input);
      if (!file) {
        return;
      }
      const text = await file.text();
      if (!text.trim()) {
        window.alert(`${file.name} is empty.`);
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
        const mutable = subject as unknown as MutableScore;
        applyLeadSheetToScore(mutable, document);
      });
    });
    window.document.body.appendChild(input);
    input.click();
  }, [subject, beatsPerBar]);

  const beatsPerCell = 0.25;

  const handleToggleNote = useCallback(
    (pitch: number, startTime: number, mode: ToggleMode) => {
      if (!activeSequence) {
        return;
      }
      const sequenceId = activeSequence.id;
      Obj.update(subject, (subject) => {
        const mutable = subject as unknown as MutableScore;
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

  // Tone.js audio playback. The ScorePlayer is rebuilt whenever the Score structure
  // changes; play/stop is driven by isPlaying. The playhead animation runs in
  // parallel via rAF — visually accurate within a few ms of the audio.
  const playerRef = useRef<ScorePlayer | null>(null);
  if (playerRef.current === null) {
    playerRef.current = new ScorePlayer();
  }

  useEffect(() => {
    const player = playerRef.current!;
    return () => player.dispose();
  }, []);

  useEffect(() => {
    const player = playerRef.current!;
    player.load(score as Score.Score);
  }, [score]);

  useEffect(() => {
    const player = playerRef.current!;
    if (!isPlaying || !activeSequence) {
      player.stop();
      setPlayhead(null);
      return;
    }
    void player.play();
    const startedAt = performance.now();
    const beatsPerSecond = score.tempo / 60;
    // Match the ScorePlayer's effective loop range so the visual playhead loops
    // in lockstep with the audio (start → end → wrap → start). Trust the
    // score-level loopStart/loopEnd directly; the loop is allowed to extend
    // past activeSequence.length.
    const loopStartBeats = Math.max(0, score.loopStart ?? 0);
    const loopEndBeats = Math.max(loopStartBeats + 0.0625, score.loopEnd ?? activeSequence.length);
    const loopSpan = loopEndBeats - loopStartBeats;
    let raf = 0;
    const tick = (now: number) => {
      const elapsedSeconds = (now - startedAt) / 1000;
      const beats = loopStartBeats + ((elapsedSeconds * beatsPerSecond) % loopSpan);
      setPlayhead(beats);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      player.stop();
    };
  }, [isPlaying, activeSequence, score.tempo, score.loopStart, score.loopEnd]);

  // Toolbar actions composed via the MenuBuilder / Menu.Root idiom
  // (org.dxos.react-ui-menu.toolbarMenu). useMemo deps cover every value the
  // menu's invoke handlers close over so the actions stay in sync.
  const togglePlay = useCallback(() => setIsPlaying((current) => !current), []);
  const toggleShowAllTracks = useCallback(() => setShowAllTracks((current) => !current), []);
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
            .action(
              'show-all-tracks',
              {
                label: showAllTracks ? 'Show active track only' : 'Show all tracks',
                icon: showAllTracks ? 'ph--stack--regular' : 'ph--stack-simple--regular',
                iconOnly: true,
                disposition: 'toolbar',
              },
              toggleShowAllTracks,
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
    [isPlaying, togglePlay, showAllTracks, toggleShowAllTracks, handleImport, handleExport],
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
                value={score.tempo}
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
              tracks={score.tracks}
              selectedTrackId={selectedTrackId}
              onSelect={setSelectedTrackId}
              onMute={handleMuteTrack}
              onAdd={handleAddTrack}
              onRemove={handleRemoveTrack}
            />
            <Oscilloscope
              classNames='h-[400px] border-green-500'
              mode='waveform'
              active={isPlaying}
              // source={playerRef.current?.outputNode}
            />
          </div>
          <div className='flex-1 min-w-0 relative'>
            {activeTrack && activeSequence ? (
              <SequenceGrid
                sequence={activeSequence}
                track={activeTrack}
                beatsPerCell={beatsPerCell}
                playhead={playhead}
                loopStart={score.loopStart}
                loopEnd={score.loopEnd}
                onLoopChange={handleLoopChange}
                onToggleNote={handleToggleNote}
                overlayTracks={
                  showAllTracks
                    ? score.tracks
                        .filter((track) => track.id !== activeTrack.id)
                        .map((track) => {
                          const sequence = score.sequences.find((seq) => seq.trackId === track.id);
                          return sequence ? { track, sequence } : null;
                        })
                        .filter((entry): entry is { track: Track.Track; sequence: Sequence.Sequence } => entry !== null)
                    : undefined
                }
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

export default ScoreArticle;
