//
// Copyright 2026 DXOS.org
//

//
// The frame classes a node's `style` resolves to. Tailwind only emits classes it can read verbatim, so
// every hue is spelled out here rather than composed from the hue name.
//

import { type Node, type NodeStyle, type NodeTone, STYLE_HUES, type StyleHue, isEllipseNode } from '../model/types.ts';

export type HueClasses = { surface: string; text: string; border: string };

const HUES: Record<string, HueClasses> = {
  neutral: { surface: 'bg-neutral-surface', text: 'text-neutral-fg', border: 'border-neutral-border' },
  red: { surface: 'bg-red-surface', text: 'text-red-fg', border: 'border-red-border' },
  orange: { surface: 'bg-orange-surface', text: 'text-orange-fg', border: 'border-orange-border' },
  amber: { surface: 'bg-amber-surface', text: 'text-amber-fg', border: 'border-amber-border' },
  yellow: { surface: 'bg-yellow-surface', text: 'text-yellow-fg', border: 'border-yellow-border' },
  lime: { surface: 'bg-lime-surface', text: 'text-lime-fg', border: 'border-lime-border' },
  green: { surface: 'bg-green-surface', text: 'text-green-fg', border: 'border-green-border' },
  emerald: { surface: 'bg-emerald-surface', text: 'text-emerald-fg', border: 'border-emerald-border' },
  teal: { surface: 'bg-teal-surface', text: 'text-teal-fg', border: 'border-teal-border' },
  cyan: { surface: 'bg-cyan-surface', text: 'text-cyan-fg', border: 'border-cyan-border' },
  sky: { surface: 'bg-sky-surface', text: 'text-sky-fg', border: 'border-sky-border' },
  blue: { surface: 'bg-blue-surface', text: 'text-blue-fg', border: 'border-blue-border' },
  indigo: { surface: 'bg-indigo-surface', text: 'text-indigo-fg', border: 'border-indigo-border' },
  violet: { surface: 'bg-violet-surface', text: 'text-violet-fg', border: 'border-violet-border' },
  purple: { surface: 'bg-purple-surface', text: 'text-purple-fg', border: 'border-purple-border' },
  fuchsia: { surface: 'bg-fuchsia-surface', text: 'text-fuchsia-fg', border: 'border-fuchsia-border' },
  pink: { surface: 'bg-pink-surface', text: 'text-pink-fg', border: 'border-pink-border' },
  rose: { surface: 'bg-rose-surface', text: 'text-rose-fg', border: 'border-rose-border' },
};

export const TONES: readonly NodeTone[] = [0, 1, 2, 3];

/** What each tone is called, for labels. */
export const TONE_NAMES: Record<NodeTone, string> = { 0: 'outline', 1: 'strong', 2: 'medium', 3: 'light' };

/** The tone a hue without one draws at: the look a hue had before tones. */
export const DEFAULT_TONE: NodeTone = 3;

type ToneClasses = { surface: string; text: string };

/**
 * The fills stronger than a hue's `surface` role: its solid `bg` role under light text (tone 1), and the scale's
 * 500, between the two, under the hue's own text (tone 2). Tone 3 is the role pair in `HUES`; tone 0 has no fill.
 */
const TONE_FILLS: Record<StyleHue, Record<'strong' | 'middle', ToneClasses>> = {
  neutral: {
    middle: { surface: 'bg-neutral-500', text: 'text-neutral-fg' },
    strong: { surface: 'bg-neutral-bg', text: 'text-neutral-50' },
  },
  red: {
    middle: { surface: 'bg-red-500', text: 'text-red-fg' },
    strong: { surface: 'bg-red-bg', text: 'text-neutral-50' },
  },
  orange: {
    middle: { surface: 'bg-orange-500', text: 'text-orange-fg' },
    strong: { surface: 'bg-orange-bg', text: 'text-neutral-50' },
  },
  amber: {
    middle: { surface: 'bg-amber-500', text: 'text-amber-fg' },
    strong: { surface: 'bg-amber-bg', text: 'text-neutral-50' },
  },
  green: {
    middle: { surface: 'bg-green-500', text: 'text-green-fg' },
    strong: { surface: 'bg-green-bg', text: 'text-neutral-50' },
  },
  teal: {
    middle: { surface: 'bg-teal-500', text: 'text-teal-fg' },
    strong: { surface: 'bg-teal-bg', text: 'text-neutral-50' },
  },
  sky: {
    middle: { surface: 'bg-sky-500', text: 'text-sky-fg' },
    strong: { surface: 'bg-sky-bg', text: 'text-neutral-50' },
  },
  blue: {
    middle: { surface: 'bg-blue-500', text: 'text-blue-fg' },
    strong: { surface: 'bg-blue-bg', text: 'text-neutral-50' },
  },
  violet: {
    middle: { surface: 'bg-violet-500', text: 'text-violet-fg' },
    strong: { surface: 'bg-violet-bg', text: 'text-neutral-50' },
  },
};

const isStyleHue = (hue: string): hue is StyleHue => STYLE_HUES.some((candidate) => candidate === hue);

/** The default look: the base surface, the base text and the separator border. */
const DEFAULT: HueClasses = { surface: 'bg-base-surface', text: '', border: 'border-separator' };

/**
 * The classes a hue at a tone draws with. Every tone keeps the hue's border; tone 0 drops the fill and
 * keeps the default text, and a tone a hue has no fills for draws as `light` (its role pair).
 */
export const hueClasses = (hue: string | undefined, tone: NodeTone = DEFAULT_TONE): HueClasses => {
  const base = (hue && HUES[hue]) || DEFAULT;
  if (!hue || base === DEFAULT) {
    return base;
  }
  if (tone === 0) {
    return { surface: 'bg-transparent', text: '', border: base.border };
  }
  if ((tone === 1 || tone === 2) && isStyleHue(hue)) {
    return { ...TONE_FILLS[hue][tone === 1 ? 'strong' : 'middle'], border: base.border };
  }
  return base;
};

/**
 * A node's style with the defaults the frame draws spelled out: an unset `fill` or `border` is drawn, so
 * the properties panel must show it as on rather than as an unset (off) toggle.
 */
export const resolveStyle = (style: NodeStyle = {}): NodeStyle => ({
  ...style,
  fill: style.fill ?? true,
  border: style.border ?? true,
});

/**
 * Frame classes for a node: fill and text colour, border and corner radius from its style; a guide is
 * dashed and unfilled, and the host's `className` comes last so it wins.
 */
export const frameClasses = (node: Node, selected: boolean, hovered = false): string[] => {
  const style = resolveStyle(node.style);
  const hue = hueClasses(style.hue, style.tone);
  const filled = style.fill && !style.guide;
  return [
    filled ? hue.surface : '',
    hue.text,
    selected
      ? 'border-primary-500'
      : hovered
        ? 'border-primary-500/50'
        : style.border === false && !style.guide
          ? 'border-transparent'
          : hue.border,
    style.guide ? 'border-dashed' : '',
    isEllipseNode(node) ? 'rounded-[50%]' : style.rounded ? 'rounded-2xl' : 'rounded-sm',
    style.className ?? '',
  ];
};

export type LineClasses = { stroke: string; fill: string };

/** A link's stroke and its end markers' fill, in the hue's border colour so a link matches a node of its hue. */
const LINE_CLASSES: Record<StyleHue, LineClasses> = {
  neutral: { stroke: 'stroke-neutral-border', fill: 'fill-neutral-border' },
  red: { stroke: 'stroke-red-border', fill: 'fill-red-border' },
  orange: { stroke: 'stroke-orange-border', fill: 'fill-orange-border' },
  amber: { stroke: 'stroke-amber-border', fill: 'fill-amber-border' },
  green: { stroke: 'stroke-green-border', fill: 'fill-green-border' },
  teal: { stroke: 'stroke-teal-border', fill: 'fill-teal-border' },
  sky: { stroke: 'stroke-sky-border', fill: 'fill-sky-border' },
  blue: { stroke: 'stroke-blue-border', fill: 'fill-blue-border' },
  violet: { stroke: 'stroke-violet-border', fill: 'fill-violet-border' },
};

/** The default line: the grey every link drew before lines took a hue. */
const DEFAULT_LINE: LineClasses = { stroke: 'stroke-neutral-500', fill: 'fill-neutral-500' };

export const lineClasses = (hue: StyleHue | undefined): LineClasses => (hue ? LINE_CLASSES[hue] : DEFAULT_LINE);
