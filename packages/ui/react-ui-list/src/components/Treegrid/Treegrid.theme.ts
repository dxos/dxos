//
// Copyright 2024 DXOS.org
//

import { tv } from '@dxos/ui-theme';

// Per-level indentation of the first `.indent` cell, plus a bolder root row. Clamped to 1–8.
const levelStyles = new Map<number, string>([
  [1, '[&>.indent:first-of-type]:pl-0 font-medium'],
  [2, '[&>.indent:first-of-type]:pl-0'],
  [3, '[&>.indent:first-of-type]:pl-1'],
  [4, '[&>.indent:first-of-type]:pl-2'],
  [5, '[&>.indent:first-of-type]:pl-3'],
  [6, '[&>.indent:first-of-type]:pl-4'],
  [7, '[&>.indent:first-of-type]:pl-5'],
  [8, '[&>.indent:first-of-type]:pl-6'],
]);

const treegridStyles = tv({
  slots: {
    root: 'grid',
    row: '',
    cell: '',
  },
  variants: {
    // `indent` marks the cell that carries the per-level left padding (selected via `.indent`).
    indent: {
      true: { cell: 'indent' },
    },
  },
});

/** Self-contained {@link Treegrid} theme (tailwind-variants), plus the level→row-class lookup. */
export const treegridTheme = {
  styles: treegridStyles,
  /** Row class for a 1-based depth level (clamped to 1–8). */
  rowLevel: (level: number): string => levelStyles.get(Math.min(Math.max(Math.round(level), 1), 8)) ?? '',
};
