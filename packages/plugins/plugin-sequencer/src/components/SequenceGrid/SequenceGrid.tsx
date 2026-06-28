//
// Copyright 2026 DXOS.org
//

import { RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import {
  type Cell,
  type CellCoord,
  type RenderCell,
  type Row,
  type ToggleMode,
  type Tool,
  CellGrid,
  cellKey,
  createCellGridAtoms,
  toggleCell,
} from '@dxos/react-ui-canvas';
import { mx } from '@dxos/ui-theme';

import type { Note, Sequence, Track } from '#types';

import { hueFor, hueToHex } from '../../util/hue';
import { LoopMarkers } from '../LoopMarkers';

export type SequenceGridProps = {
  sequence: Sequence.Sequence;
  track: Track.Track;
  /** Visible pitch floor (inclusive). Defaults to track.minPitch ?? 36. */
  minPitch?: number;
  /** Visible pitch ceiling (inclusive). Defaults to track.maxPitch ?? 84. */
  maxPitch?: number;
  /** Cell width in beats. Defaults to 0.25 (sixteenth notes at 4/4). */
  beatsPerCell?: number;
  /** Playhead in beats from sequence start, or null when stopped. */
  playhead?: number | null;
  /**
   * Playback loop range in beats. When set, the timeline shows draggable
   * start/end markers and shades the area outside the range. The range applies
   * to every track simultaneously; callers should write it back to Score.loopStart
   * / Score.loopEnd via `onLoopChange`.
   */
  loopStart?: number;
  loopEnd?: number;
  onLoopChange?: (loopStart: number, loopEnd: number) => void;
  /**
   * Active tool mode. 'toggle' (default) flips notes on click/drag; 'edit' draws a single
   * note spanning the drag extent; 'delete' always removes.
   */
  tool?: Tool;
  /** Beats per bar used for auto-scroll bar snapping. Defaults to 4 (4/4 time). */
  beatsPerBar?: number;
  /**
   * Called when the user toggles a cell. The caller is responsible for mutating the sequence.
   * `mode` reflects the gesture: a single click reports `toggle`; a drag reports `set` or
   * `unset` for every cell crossed (chosen by the cell under the initial pointerdown).
   * `duration` is provided by the edit tool to specify the note length in beats.
   */
  onToggleNote?: (pitch: number, startTime: number, mode: ToggleMode, duration?: number) => void;
  /**
   * Called when the user drags on an existing note to resize it.
   * Mutating the duration in-place is preferred over remove+add.
   */
  onResizeNote?: (pitch: number, startTime: number, newDuration: number) => void;
  /**
   * Other tracks to paint underneath the active sequence in a subdued color.
   * Cells from these tracks are non-interactive — toggle gestures always target
   * the active sequence.
   */
  overlayTracks?: Array<{ sequence: Sequence.Sequence; track: Track.Track }>;
  classNames?: string;
};

const MIDDLE_C = 60;
const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const pitchLabel = (pitch: number): string => {
  const octave = Math.floor(pitch / 12) - 1;
  const name = PITCH_NAMES[((pitch % 12) + 12) % 12];
  return `${name}${octave}`;
};

const isBlackKey = (pitch: number): boolean => {
  const offset = ((pitch % 12) + 12) % 12;
  return offset === 1 || offset === 3 || offset === 6 || offset === 8 || offset === 10;
};

const renderNoteCell: RenderCell<{ color: string; velocity: number; subdued?: boolean }> = ({
  ctx,
  x,
  y,
  w,
  h,
  cell,
}) => {
  const inset = 1;
  const radius = 3;
  ctx.fillStyle = cell.data?.color ?? '#3b82f6';
  const baseAlpha = 0.35 + (cell.data?.velocity ?? 0.8) * 0.65;
  ctx.globalAlpha = cell.data?.subdued ? baseAlpha * 0.35 : baseAlpha;
  const rx = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + inset + rx, y + inset);
  ctx.lineTo(x + w - inset - rx, y + inset);
  ctx.quadraticCurveTo(x + w - inset, y + inset, x + w - inset, y + inset + rx);
  ctx.lineTo(x + w - inset, y + h - inset - rx);
  ctx.quadraticCurveTo(x + w - inset, y + h - inset, x + w - inset - rx, y + h - inset);
  ctx.lineTo(x + inset + rx, y + h - inset);
  ctx.quadraticCurveTo(x + inset, y + h - inset, x + inset, y + h - inset - rx);
  ctx.lineTo(x + inset, y + inset + rx);
  ctx.quadraticCurveTo(x + inset, y + inset, x + inset + rx, y + inset);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
};

/** Find a note on `pitch` whose time span includes `beat`. */
const findNoteAtBeat = (notes: ReadonlyArray<Note.Note>, pitch: number, beat: number): Note.Note | undefined =>
  notes.find(
    (note) => note.pitch === pitch && note.startTime <= beat + 1e-6 && beat < note.startTime + note.duration - 1e-6,
  );

/**
 * Maximum end column (inclusive) a note starting at `noteStartCol` on `pitch` may occupy
 * without overlapping any other note. Pass `excludeStartTime` to skip the note being resized.
 */
const maxNoteEndCol = (
  notes: ReadonlyArray<Note.Note>,
  pitch: number,
  noteStartCol: number,
  beatsPerCell: number,
  excludeStartTime?: number,
): number => {
  let max = Number.MAX_SAFE_INTEGER;
  for (const note of notes) {
    if (note.pitch !== pitch) {
      continue;
    }
    if (excludeStartTime !== undefined && Math.abs(note.startTime - excludeStartTime) < 1e-6) {
      continue;
    }
    const col = Math.round(note.startTime / beatsPerCell);
    if (col > noteStartCol) {
      max = Math.min(max, col - 1);
    }
  }
  return max;
};

/**
 * Minimum start column (inclusive) a note whose right edge is at `anchorCol` may begin at
 * on `pitch` without overlapping any other note to the left of that anchor.
 */
const minNoteStartCol = (
  notes: ReadonlyArray<Note.Note>,
  pitch: number,
  anchorCol: number,
  beatsPerCell: number,
): number => {
  let min = 0;
  for (const note of notes) {
    if (note.pitch !== pitch) {
      continue;
    }
    const col = Math.round(note.startTime / beatsPerCell);
    const endCol = col + Math.max(1, Math.round(note.duration / beatsPerCell)) - 1;
    if (endCol < anchorCol) {
      min = Math.max(min, endCol + 1);
    }
  }
  return min;
};

/**
 * 2D piano-roll style editor for a single Sequence. Y-axis = pitch (high pitches on top);
 * x-axis = time in beats. Renders via the shared CellGrid canvas component.
 */
export const SequenceGrid = ({
  sequence,
  track,
  minPitch: minPitchProp,
  maxPitch: maxPitchProp,
  beatsPerCell = 0.25,
  beatsPerBar = 4,
  playhead = null,
  loopStart,
  loopEnd,
  onLoopChange,
  onToggleNote,
  onResizeNote,
  overlayTracks,
  tool = 'edit',
  classNames,
}: SequenceGridProps) => {
  const registry = useContext(RegistryContext);
  // Resolve pitch bounds with a fallback, then swap-and-clamp so a misconfigured
  // track (or a prop typo) can never produce a negative row count and crash
  // `Array.from({ length: maxPitch - minPitch + 1 })`. Default span covers the
  // full 88-key piano (A0..C8 = MIDI 21..108).
  const rawMin = minPitchProp ?? track.minPitch ?? 21;
  const rawMax = maxPitchProp ?? track.maxPitch ?? 108;
  const minPitch = Math.min(rawMin, rawMax);
  const maxPitch = Math.max(rawMin, rawMax);
  const trackColor = hueToHex(hueFor(track));

  const atoms = useMemo(
    () =>
      createCellGridAtoms<{ color: string; velocity: number; subdued?: boolean }>({ cellWidth: 28, cellHeight: 18 }),
    [],
  );

  // Temporary cell shown while the user is mid-drag with the edit tool.
  const [drawPreview, setDrawPreview] = useState<{ col: number; row: number; length: number } | null>(null);
  // Tracks the existing note being resized during a drag gesture (set on pointerdown, cleared on commit).
  const resizeNoteRef = useRef<Note.Note | null>(null);

  // Rows are pitches arranged high-to-low (row 0 = maxPitch at the top).
  const rows: Row[] = useMemo(
    () =>
      Array.from({ length: maxPitch - minPitch + 1 }, (_, i) => {
        const pitch = maxPitch - i;
        return { id: String(pitch), label: pitchLabel(pitch) };
      }),
    [minPitch, maxPitch],
  );

  // Project notes into the CellGrid cell map.
  // ECHO can hand back a snapshot where `notes` is either undefined or an array-like
  // Automerge proxy without Symbol.iterator. Normalize through Array.from so iteration
  // is robust to both.
  const notes = useMemo<ReadonlyArray<Note.Note>>(
    () =>
      sequence.notes == null
        ? []
        : Array.isArray(sequence.notes)
          ? (sequence.notes as ReadonlyArray<Note.Note>)
          : Array.from(sequence.notes as ArrayLike<Note.Note>),
    [sequence.notes],
  );
  // Pre-flatten overlayTracks notes via a stable identity so the effect doesn't
  // rebuild the cell map on every render when overlayTracks is an inline array.
  const overlayCellInputs = useMemo(() => {
    if (!overlayTracks || overlayTracks.length === 0) {
      return [];
    }
    const inputs: Array<{ pitch: number; startTime: number; duration: number; velocity: number; color: string }> = [];
    for (const entry of overlayTracks) {
      const overlayNotes =
        entry.sequence.notes == null
          ? []
          : Array.isArray(entry.sequence.notes)
            ? (entry.sequence.notes as ReadonlyArray<Note.Note>)
            : Array.from(entry.sequence.notes as ArrayLike<Note.Note>);
      const color = hueToHex(hueFor(entry.track));
      for (const note of overlayNotes) {
        inputs.push({
          pitch: note.pitch,
          startTime: note.startTime,
          duration: note.duration,
          velocity: note.velocity ?? 0.8,
          color,
        });
      }
    }
    return inputs;
  }, [overlayTracks]);

  useEffect(() => {
    const cells = new Map<string, Cell<{ color: string; velocity: number; subdued?: boolean }>>();
    // Paint overlay tracks first so the active sequence visibly wins on collisions.
    for (const note of overlayCellInputs) {
      if (note.pitch < minPitch || note.pitch > maxPitch) {
        continue;
      }
      const row = maxPitch - note.pitch;
      const col = Math.round(note.startTime / beatsPerCell);
      const length = Math.max(1, Math.round(note.duration / beatsPerCell));
      cells.set(cellKey(col, row), {
        col,
        row,
        length,
        data: { color: note.color, velocity: note.velocity, subdued: true },
      });
    }
    for (const note of notes) {
      if (note.pitch < minPitch || note.pitch > maxPitch) {
        continue;
      }
      const row = maxPitch - note.pitch;
      const col = Math.round(note.startTime / beatsPerCell);
      const length = Math.max(1, Math.round(note.duration / beatsPerCell));
      cells.set(cellKey(col, row), {
        col,
        row,
        length,
        data: { color: trackColor, velocity: note.velocity ?? 0.8 },
      });
    }
    // Show a live preview cell while the user drags with the edit tool.
    if (drawPreview) {
      cells.set(cellKey(drawPreview.col, drawPreview.row), {
        col: drawPreview.col,
        row: drawPreview.row,
        length: drawPreview.length,
        data: { color: trackColor, velocity: 0.8 },
      });
    }
    registry.set(atoms.cells, cells);
  }, [registry, atoms.cells, notes, overlayCellInputs, minPitch, maxPitch, beatsPerCell, trackColor, drawPreview]);

  // Mirror playhead (beats → column units, accounting for beatsPerCell).
  useEffect(() => {
    registry.set(atoms.playhead, playhead === null ? null : playhead / beatsPerCell);
  }, [registry, atoms.playhead, playhead, beatsPerCell]);

  // Sync the active tool into the atoms so the pointer handler uses the right mode.
  useEffect(() => {
    registry.set(atoms.tool, tool);
  }, [registry, atoms.tool, tool]);

  const handleToggle = useCallback(
    (coord: CellCoord, mode: ToggleMode) => {
      const pitch = maxPitch - coord.row;
      const startTime = coord.col * beatsPerCell;
      if (onToggleNote) {
        onToggleNote(pitch, startTime, mode);
        return;
      }
      // Default: write directly to the cells atom (preview mode).
      toggleCell(
        registry,
        atoms,
        coord,
        ({ col, row }) => ({ col, row, length: 1, data: { color: trackColor, velocity: 0.8 } }),
        mode,
      );
    },
    [maxPitch, beatsPerCell, onToggleNote, registry, atoms, trackColor],
  );

  const handleDrawUpdate = useCallback(
    (startCoord: CellCoord, endCoord: CellCoord) => {
      const pitch = maxPitch - startCoord.row;
      const startBeat = startCoord.col * beatsPerCell;

      // Initial pointerdown call (start === end): detect gesture type.
      if (startCoord.col === endCoord.col) {
        resizeNoteRef.current = findNoteAtBeat(notes, pitch, startBeat) ?? null;
        if (!resizeNoteRef.current) {
          // Empty cell: show immediate 1-cell preview.
          setDrawPreview({ col: startCoord.col, row: startCoord.row, length: 1 });
        }
        // For resize: the existing note is already visible; skip preview update.
        return;
      }

      const existingNote = resizeNoteRef.current;

      if (existingNote) {
        // Resize mode: anchor is the existing note's start, right edge follows drag.
        const noteStartCol = Math.round(existingNote.startTime / beatsPerCell);
        const maxEnd = maxNoteEndCol(notes, pitch, noteStartCol, beatsPerCell, existingNote.startTime);
        const clampedEnd = Math.max(noteStartCol, Math.min(endCoord.col, maxEnd));
        setDrawPreview({ col: noteStartCol, row: startCoord.row, length: clampedEnd - noteStartCol + 1 });
      } else if (endCoord.col >= startCoord.col) {
        // New note, dragging right: clamp end against right-side notes.
        const maxEnd = maxNoteEndCol(notes, pitch, startCoord.col, beatsPerCell);
        const clampedEnd = Math.min(endCoord.col, maxEnd);
        setDrawPreview({ col: startCoord.col, row: startCoord.row, length: clampedEnd - startCoord.col + 1 });
      } else {
        // New note, dragging left: clamp start against left-side notes.
        const minStart = minNoteStartCol(notes, pitch, startCoord.col, beatsPerCell);
        const clampedStart = Math.max(endCoord.col, minStart);
        setDrawPreview({ col: clampedStart, row: startCoord.row, length: startCoord.col - clampedStart + 1 });
      }
    },
    [notes, maxPitch, beatsPerCell],
  );

  const handleDrawCommit = useCallback(
    (startCoord: CellCoord, endCoord: CellCoord) => {
      setDrawPreview(null);
      const pitch = maxPitch - startCoord.row;
      const startBeat = startCoord.col * beatsPerCell;

      const existingNote = resizeNoteRef.current;
      resizeNoteRef.current = null;

      // Pure click (no drag).
      if (startCoord.col === endCoord.col) {
        if (onToggleNote) {
          if (existingNote) {
            // Click on existing note: remove it.
            onToggleNote(pitch, existingNote.startTime, 'unset');
          } else {
            // Click on empty cell: add a 1-cell note.
            onToggleNote(pitch, startBeat, 'set', beatsPerCell);
          }
          return;
        }
        // Atoms-only mode: always add.
        registry.update(atoms.cells, (current) => {
          const next = new Map(current);
          next.set(cellKey(startCoord.col, startCoord.row), {
            col: startCoord.col,
            row: startCoord.row,
            length: 1,
            data: { color: trackColor, velocity: 0.8 },
          });
          return next;
        });
        return;
      }

      // Drag on existing note: resize.
      if (existingNote) {
        const noteStartCol = Math.round(existingNote.startTime / beatsPerCell);
        const maxEnd = maxNoteEndCol(notes, pitch, noteStartCol, beatsPerCell, existingNote.startTime);
        const clampedEnd = Math.max(noteStartCol, Math.min(endCoord.col, maxEnd));
        const newDuration = (clampedEnd - noteStartCol + 1) * beatsPerCell;
        if (onResizeNote) {
          onResizeNote(pitch, existingNote.startTime, newDuration);
          return;
        }
        if (onToggleNote) {
          // Fallback: remove old note then add resized version.
          onToggleNote(pitch, existingNote.startTime, 'unset');
          onToggleNote(pitch, existingNote.startTime, 'set', newDuration);
          return;
        }
        // Atoms-only: update cell in place.
        registry.update(atoms.cells, (current) => {
          const next = new Map(current);
          next.set(cellKey(noteStartCol, startCoord.row), {
            col: noteStartCol,
            row: startCoord.row,
            length: clampedEnd - noteStartCol + 1,
            data: { color: trackColor, velocity: 0.8 },
          });
          return next;
        });
        return;
      }

      // New note draw.
      let col: number;
      let length: number;
      if (endCoord.col >= startCoord.col) {
        const maxEnd = maxNoteEndCol(notes, pitch, startCoord.col, beatsPerCell);
        const clampedEnd = Math.min(endCoord.col, maxEnd);
        col = startCoord.col;
        length = clampedEnd - col + 1;
      } else {
        const minStart = minNoteStartCol(notes, pitch, startCoord.col, beatsPerCell);
        const clampedStart = Math.max(endCoord.col, minStart);
        col = clampedStart;
        length = startCoord.col - col + 1;
      }

      const noteStartTime = col * beatsPerCell;
      const duration = length * beatsPerCell;
      if (onToggleNote) {
        onToggleNote(pitch, noteStartTime, 'set', duration);
        return;
      }
      // Atoms-only mode: write directly to cells.
      registry.update(atoms.cells, (current) => {
        const next = new Map(current);
        next.set(cellKey(col, startCoord.row), {
          col,
          row: startCoord.row,
          length,
          data: { color: trackColor, velocity: 0.8 },
        });
        return next;
      });
    },
    [notes, maxPitch, beatsPerCell, onToggleNote, onResizeNote, registry, atoms.cells, trackColor],
  );

  // Style the row bands so black-key rows are darker (piano-roll feel).
  const rowBandRenderer = useMemo(() => {
    return {
      isBlackKey: (rowIndex: number) => isBlackKey(maxPitch - rowIndex),
    };
  }, [maxPitch]);

  // Stable prop identities so CellGrid's effects don't tear down on every render.
  const cellGridHeaders = useMemo(() => ({ left: 56, top: 22 }), []);
  const cellGridStaticStyle = useMemo(
    () => ({ gridLine: 'rgba(128,128,128,0.25)', rowBand: 'rgba(128,128,128,0.08)' }),
    [],
  );

  // Loop-marker projection — read viewport (scrollX, cellWidth, zoomX) reactively
  // and measure the container so the overlay sizes track the grid pane.
  const viewport = useAtomValue(atoms.viewport);
  const { ref: paneRef, width: paneWidth = 0, height: paneHeight = 0 } = useResizeDetector<HTMLDivElement>();

  // Whenever the visible pane changes height, re-center the vertical scroll
  // so the middle pitch of the configured range sits in the middle of the
  // viewport. Skips the initial 0-height transition and any tick where the
  // height hasn't actually moved, so we don't fight user-driven scrolling.
  const totalRows = maxPitch - minPitch + 1;
  const prevPaneHeightRef = useRef(0);
  useEffect(() => {
    if (paneHeight <= 0) {
      return;
    }
    if (paneHeight === prevPaneHeightRef.current) {
      return;
    }
    prevPaneHeightRef.current = paneHeight;
    const gridHeight = totalRows * viewport.cellHeight;
    const visibleHeight = Math.max(0, paneHeight - cellGridHeaders.top);
    const centeredScrollY = Math.max(0, gridHeight / 2 - visibleHeight / 2);
    registry.set(atoms.viewport, { ...viewport, scrollY: centeredScrollY });
    // viewport is intentionally omitted from the dep list — we want this to
    // fire only on paneHeight changes, not every viewport tick (which would
    // re-center after the user scrolls).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneHeight, totalRows, cellGridHeaders.top, registry, atoms.viewport]);
  const pixelsPerCell = viewport.baseCellWidth * viewport.zoomX;
  const pixelsPerBeat = pixelsPerCell / beatsPerCell;

  // Auto-scroll: when the playhead moves past the right edge of the visible area,
  // jump-scroll to the nearest previous bar boundary so bar lines stay aligned.
  useEffect(() => {
    let wasPlaying = false;
    return registry.subscribe(atoms.playhead, (playheadCol) => {
      if (playheadCol === null) {
        wasPlaying = false;
        return;
      }
      if (!wasPlaying) {
        wasPlaying = true;
        registry.update(atoms.viewport, (vp) => ({ ...vp, scrollX: 0 }));
      }
      const vp = registry.get(atoms.viewport);
      const pxPerCell = vp.baseCellWidth * vp.zoomX;
      const playheadPx = playheadCol * pxPerCell;
      const visibleWidth = Math.max(0, paneWidth - cellGridHeaders.left);
      if (visibleWidth <= 0) {
        return;
      }
      if (playheadPx > vp.scrollX + visibleWidth) {
        const pxPerBar = (beatsPerBar / beatsPerCell) * pxPerCell;
        const barAlignedScrollX = Math.floor(playheadPx / pxPerBar) * pxPerBar;
        registry.set(atoms.viewport, { ...vp, scrollX: Math.max(0, barAlignedScrollX) });
      }
    });
  }, [registry, atoms.playhead, atoms.viewport, paneWidth, cellGridHeaders.left, beatsPerBar, beatsPerCell]);
  const resolvedLoopEnd = loopEnd ?? sequence.length;
  const resolvedLoopStart = loopStart ?? 0;
  // Loop range is allowed to extend beyond the current sequence length — the
  // ScoreArticle grows sequences to match on commit. Cap at a generous maximum
  // (256 beats = 64 bars at 4/4) so dragging stays bounded.
  const loopMaxBeats = Math.max(sequence.length, 256);

  return (
    <div ref={paneRef} className={mx('relative w-full h-full', classNames)}>
      <CellGrid
        atoms={atoms as any}
        rows={rows}
        renderCell={renderNoteCell}
        headers={cellGridHeaders}
        staticStyle={cellGridStaticStyle}
        onCellToggle={handleToggle}
        onDrawUpdate={handleDrawUpdate}
        onDrawCommit={handleDrawCommit}
      />
      {onLoopChange && paneWidth > 0 && (
        <LoopMarkers
          loopStart={resolvedLoopStart}
          loopEnd={resolvedLoopEnd}
          maxBeats={loopMaxBeats}
          step={beatsPerCell}
          pixelsPerBeat={pixelsPerBeat}
          scrollX={viewport.scrollX}
          onScrollX={(deltaPx) => {
            const current = registry.get(atoms.viewport);
            registry.set(atoms.viewport, { ...current, scrollX: Math.max(0, current.scrollX + deltaPx) });
          }}
          headerLeft={cellGridHeaders.left}
          headerTop={cellGridHeaders.top}
          paneHeight={paneHeight}
          paneWidth={paneWidth}
          onChange={onLoopChange}
        />
      )}
      {/*
        rowBandRenderer is reserved for a future pass where the static layer can paint
        black-key rows differently. The current CellGrid only supports a single row-band
        color; surfacing per-row tinting is a tracked follow-up.
      */}
      <div className='hidden' aria-hidden data-row-bands={String(!!rowBandRenderer)} />
    </div>
  );
};
