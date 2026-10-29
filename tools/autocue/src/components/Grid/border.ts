//
// Copyright 2026 DXOS.org
//

import { type CSSProperties } from 'react';

/**
 * How each cell is framed. Clips of app screens have light edges and their own chrome, so cells butted together read
 * as one sheet; each style separates them a different way.
 */
export const BORDERS = ['gutter', 'card', 'mat', 'bezel', 'hairline', 'tint'] as const;

export type Border = (typeof BORDERS)[number];

/** Per-cell hues for `tint`: the hue ramps' solid fills. */
const TINTS = [
  'bg-sky-bg',
  'bg-teal-bg',
  'bg-amber-bg',
  'bg-rose-bg',
  'bg-violet-bg',
  'bg-emerald-bg',
  'bg-orange-bg',
  'bg-indigo-bg',
  'bg-lime-bg',
  'bg-pink-bg',
  'bg-cyan-bg',
  'bg-purple-bg',
];

/** The wall's ground behind the cells, per style; unset keeps the default ground. */
export const BORDER_GROUND: Partial<Record<Border, string>> = {
  gutter: 'bg-neutral-500 dark:bg-neutral-950',
  card: 'bg-group-surface',
  hairline: 'bg-base-surface',
};

export type BorderLayout = {
  /** The cell's own panel: its classes and style. */
  panel: { className: string; style: CSSProperties };
  /** The clip's box inside the panel, in px from each edge. */
  inset: number;
  /** Style of the clip's box. */
  content: CSSProperties;
};

/**
 * The cell's frame for a tile `width` px wide on screen: every size is a fraction of that width, so the frame scales
 * with the camera and a close-up keeps a thin edge; `strength` (0-1) scales it down, so it can fade out at a close-up.
 */
export const borderLayout = (border: Border, width: number, index: number, strength: number): BorderLayout => {
  const size = (fraction: number) => fraction * width * strength;
  switch (border) {
    case 'gutter':
      // The wall's gap plus this pad makes a gutter of about 2% of the cell's width.
      return { panel: { className: '', style: {} }, inset: size(0.004), content: {} };
    case 'card':
      return {
        panel: { className: '', style: {} },
        inset: size(0.012),
        content: {
          borderRadius: size(0.02),
          boxShadow: `0 ${size(0.008)}px ${size(0.03)}px oklch(0 0 0 / ${0.35 * strength})`,
        },
      };
    case 'mat':
      // The clip fills 92% of the cell, like a print in a passe-partout.
      return { panel: { className: 'bg-neutral-300 dark:bg-neutral-800', style: {} }, inset: size(0.04), content: {} };
    case 'bezel':
      return {
        panel: { className: 'bg-neutral-900 dark:bg-neutral-950', style: { borderRadius: size(0.024) } },
        inset: size(0.012),
        content: { borderRadius: size(0.012) },
      };
    case 'hairline':
      return {
        panel: { className: '', style: {} },
        inset: size(0.025),
        content: { outline: `1px solid var(--color-separator)`, opacity: 1 },
      };
    case 'tint':
      return { panel: { className: TINTS[index % TINTS.length], style: {} }, inset: size(0.015), content: {} };
  }
};
