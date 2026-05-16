//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import React, { useContext, useEffect, useMemo } from 'react';

import {
  CellGrid,
  type Cell,
  type CellCoord,
  type RenderCell,
  type Row,
  createCellGridAtoms,
  toggleCell,
  cellKey,
} from '@dxos/react-ui-canvas';
import { mx } from '@dxos/ui-theme';

import type { Sequence, Track } from '#types';

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
  /** Called when the user toggles a cell. The caller is responsible for mutating the sequence. */
  onToggleNote?: (pitch: number, startTime: number) => void;
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

const renderNoteCell: RenderCell<{ color: string; velocity: number }> = ({ ctx, x, y, w, h, cell }) => {
  const inset = 1;
  const radius = 3;
  ctx.fillStyle = cell.data?.color ?? '#3b82f6';
  ctx.globalAlpha = 0.35 + (cell.data?.velocity ?? 0.8) * 0.65;
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
  playhead = null,
  onToggleNote,
  classNames,
}: SequenceGridProps) => {
  const registry = useContext(RegistryContext);
  const minPitch = minPitchProp ?? track.minPitch ?? 36;
  const maxPitch = maxPitchProp ?? track.maxPitch ?? 84;
  const trackColor = track.color ?? '#3b82f6';

  const atoms = useMemo(
    () => createCellGridAtoms<{ color: string; velocity: number }>({ cellWidth: 28, cellHeight: 18 }),
    [],
  );

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
  useEffect(() => {
    const cells = new Map<string, Cell<{ color: string; velocity: number }>>();
    for (const note of sequence.notes) {
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
    registry.set(atoms.cells, cells);
  }, [registry, atoms.cells, sequence.notes, minPitch, maxPitch, beatsPerCell, trackColor]);

  // Mirror playhead (beats → column units, accounting for beatsPerCell).
  useEffect(() => {
    registry.set(atoms.playhead, playhead === null ? null : playhead / beatsPerCell);
  }, [registry, atoms.playhead, playhead, beatsPerCell]);

  const handleToggle = (coord: CellCoord) => {
    const pitch = maxPitch - coord.row;
    const startTime = coord.col * beatsPerCell;
    if (onToggleNote) {
      onToggleNote(pitch, startTime);
      return;
    }
    // Default: write directly to the cells atom (preview mode).
    toggleCell(registry, atoms, coord, ({ col, row }) => ({
      col,
      row,
      length: 1,
      data: { color: trackColor, velocity: 0.8 },
    }));
  };

  // Style the row bands so black-key rows are darker (piano-roll feel).
  const rowBandRenderer = useMemo(() => {
    return {
      isBlackKey: (rowIndex: number) => isBlackKey(maxPitch - rowIndex),
    };
  }, [maxPitch]);

  return (
    <div className={mx('relative w-full h-full', classNames)}>
      <CellGrid
        atoms={atoms as any}
        rows={rows}
        renderCell={renderNoteCell}
        headers={{ left: 56, top: 22 }}
        staticStyle={{
          gridLine: 'rgba(128,128,128,0.25)',
          rowBand: 'rgba(128,128,128,0.08)',
        }}
        onCellToggle={handleToggle}
      />
      {/*
        rowBandRenderer is reserved for a future pass where the static layer can paint
        black-key rows differently. The current CellGrid only supports a single row-band
        color; surfacing per-row tinting is a tracked follow-up.
      */}
      <div className='hidden' aria-hidden data-row-bands={String(!!rowBandRenderer)} />
    </div>
  );
};
