//
// Copyright 2026 DXOS.org
//

//
// The frame classes a node's `style` resolves to. Tailwind only emits classes it can read verbatim, so
// every hue is spelled out here rather than composed from the hue name.
//

import { type Node, type NodeStyle, type NodeTone, isEllipseNode } from '../model/types.ts';

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

/** The hues the style picker offers, neutral first; any theme hue still renders, at its `medium` tone. */
export const STYLE_HUES = ['neutral', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet', 'pink'] as const;
export type StyleHue = (typeof STYLE_HUES)[number];

export const TONES: readonly NodeTone[] = ['outline', 'light', 'medium', 'strong'];

type ToneClasses = { surface: string; text: string };

/**
 * The fills lighter and stronger than a hue's `surface` role: the scale's 200 under its darkest text, and the
 * hue's solid `bg` role under light text. `medium` is the role pair in `HUES`; `outline` has no fill.
 */
const TONE_FILLS: Record<StyleHue, Record<'light' | 'strong', ToneClasses>> = {
  neutral: {
    light: { surface: 'bg-neutral-200', text: 'text-neutral-900' },
    strong: { surface: 'bg-neutral-bg', text: 'text-neutral-50' },
  },
  red: {
    light: { surface: 'bg-red-200', text: 'text-red-900' },
    strong: { surface: 'bg-red-bg', text: 'text-neutral-50' },
  },
  orange: {
    light: { surface: 'bg-orange-200', text: 'text-orange-900' },
    strong: { surface: 'bg-orange-bg', text: 'text-neutral-50' },
  },
  amber: {
    light: { surface: 'bg-amber-200', text: 'text-amber-900' },
    strong: { surface: 'bg-amber-bg', text: 'text-neutral-50' },
  },
  green: {
    light: { surface: 'bg-green-200', text: 'text-green-900' },
    strong: { surface: 'bg-green-bg', text: 'text-neutral-50' },
  },
  teal: {
    light: { surface: 'bg-teal-200', text: 'text-teal-900' },
    strong: { surface: 'bg-teal-bg', text: 'text-neutral-50' },
  },
  blue: {
    light: { surface: 'bg-blue-200', text: 'text-blue-900' },
    strong: { surface: 'bg-blue-bg', text: 'text-neutral-50' },
  },
  violet: {
    light: { surface: 'bg-violet-200', text: 'text-violet-900' },
    strong: { surface: 'bg-violet-bg', text: 'text-neutral-50' },
  },
  pink: {
    light: { surface: 'bg-pink-200', text: 'text-pink-900' },
    strong: { surface: 'bg-pink-bg', text: 'text-neutral-50' },
  },
};

const isStyleHue = (hue: string): hue is StyleHue => STYLE_HUES.some((candidate) => candidate === hue);

/** The default look: the base surface, the base text and the separator border. */
const DEFAULT: HueClasses = { surface: 'bg-base-surface', text: '', border: 'border-separator' };

/**
 * The classes a hue at a tone draws with. Every tone keeps the hue's border; `outline` drops the fill and
 * keeps the default text, and a tone a hue has no fills for draws as `medium`.
 */
export const hueClasses = (hue: string | undefined, tone: NodeTone = 'medium'): HueClasses => {
  const base = (hue && HUES[hue]) || DEFAULT;
  if (!hue || base === DEFAULT) {
    return base;
  }
  if (tone === 'outline') {
    return { surface: 'bg-transparent', text: '', border: base.border };
  }
  if (tone !== 'medium' && isStyleHue(hue)) {
    return { ...TONE_FILLS[hue][tone], border: base.border };
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
