//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/ui-theme';

import { type Pitch, type ScaleNote } from '#audio';

export type HandpanLayoutProps = {
  notes: ScaleNote[];
  /** Note awaiting input (e.g. the calibration target). */
  target?: Pitch;
  /** Note most recently played. */
  active?: Pitch;
  /** Per-note completion (0–1), drawn as a ring. */
  progress?: Record<Pitch, number>;
  onSelect?: (note: ScaleNote) => void;
  classNames?: string;
};

const SIZE = 320;
const CENTER = SIZE / 2;
const RING = 118;
const DING_RADIUS = 46;
const NOTE_RADIUS = 34;

/**
 * Top-down handpan: the ding in the centre and tone fields around the rim, ascending in the
 * conventional zig-zag from the bottom (1 bottom, 2 left, 3 right, …).
 */
export const HandpanLayout = ({ notes, target, active, progress, onSelect, classNames }: HandpanLayoutProps) => {
  const fields = notes.filter((note) => note.index > 0);
  const step = (2 * Math.PI) / Math.max(fields.length, 1);

  const position = (note: ScaleNote) => {
    if (note.index === 0) {
      return { x: CENTER, y: CENTER, radius: DING_RADIUS };
    }
    const rank = note.index - 1;
    const angle = Math.PI / 2 + Math.ceil(rank / 2) * step * (rank % 2 ? 1 : -1);
    return { x: CENTER + RING * Math.cos(angle), y: CENTER + RING * Math.sin(angle), radius: NOTE_RADIUS };
  };

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={mx('w-full max-w-[24rem] aspect-square select-none', classNames)}
      role='group'
      aria-label='Handpan'
    >
      <circle cx={CENTER} cy={CENTER} r={CENTER - 4} className='fill-group-surface stroke-separator' strokeWidth={2} />
      {notes.map((note) => {
        const { x, y, radius } = position(note);
        const done = progress?.[note.pitch] ?? 0;
        const circumference = 2 * Math.PI * (radius + 4);
        return (
          <g
            key={note.pitch}
            role='button'
            tabIndex={onSelect ? 0 : -1}
            aria-label={`${note.label} ${note.pitch}`}
            aria-pressed={note.pitch === active}
            aria-current={note.pitch === target || undefined}
            data-testid={`handpan.note.${note.label}`}
            className={mx('outline-none', onSelect && 'cursor-pointer')}
            onClick={() => onSelect?.(note)}
            onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && onSelect?.(note)}
          >
            <circle
              cx={x}
              cy={y}
              r={radius}
              strokeWidth={note.pitch === target ? 3 : 1.5}
              className={mx(
                'transition-colors duration-150',
                note.pitch === active ? 'fill-accent-bg' : 'fill-card-surface',
                note.pitch === target ? 'stroke-accent-text' : 'stroke-separator',
              )}
            />
            {done > 0 && (
              <circle
                cx={x}
                cy={y}
                r={radius + 4}
                fill='none'
                strokeWidth={3}
                strokeDasharray={`${circumference * Math.min(done, 1)} ${circumference}`}
                transform={`rotate(-90 ${x} ${y})`}
                className='stroke-accent-text'
              />
            )}
            <text
              x={x}
              y={y - 2}
              textAnchor='middle'
              className={mx('text-xl font-medium', note.pitch === active ? 'fill-accent-fg' : 'fill-fg')}
            >
              {note.label}
            </text>
            <text
              x={x}
              y={y + 16}
              textAnchor='middle'
              className={mx('text-xs', note.pitch === active ? 'fill-accent-fg' : 'fill-fg-muted')}
            >
              {note.pitch}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
