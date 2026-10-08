//
// Copyright 2026 DXOS.org
//

//
// The frame classes a node's `style` resolves to. Tailwind only emits classes it can read verbatim, so
// every hue is spelled out here rather than composed from the hue name.
//

import {
  type Link,
  type Node,
  type NodeStyle,
  type NodeTone,
  STYLE_HUES,
  type StyleHue,
  type StyleMap,
  isEllipseNode,
  isPortalNode,
  showsContents,
} from '../model/types.ts';

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
export const DEFAULT_TONE: NodeTone = 2;

type ToneClasses = { surface: string; text: string };

/**
 * The fills either side of a hue's `surface` role (its 400): the scale's 500 under light text (tone 1), and its
 * 300 under its darkest text (tone 3). Tone 2 is the role pair in `HUES`; tone 0 has no fill.
 */
const TONE_FILLS: Record<StyleHue, Record<'strong' | 'light', ToneClasses>> = {
  neutral: {
    light: { surface: 'bg-neutral-300', text: 'text-neutral-900' },
    strong: { surface: 'bg-neutral-500', text: 'text-neutral-50' },
  },
  red: {
    light: { surface: 'bg-red-300', text: 'text-red-900' },
    strong: { surface: 'bg-red-500', text: 'text-neutral-50' },
  },
  orange: {
    light: { surface: 'bg-orange-300', text: 'text-orange-900' },
    strong: { surface: 'bg-orange-500', text: 'text-neutral-50' },
  },
  amber: {
    light: { surface: 'bg-amber-300', text: 'text-amber-900' },
    strong: { surface: 'bg-amber-500', text: 'text-neutral-50' },
  },
  green: {
    light: { surface: 'bg-green-300', text: 'text-green-900' },
    strong: { surface: 'bg-green-500', text: 'text-neutral-50' },
  },
  teal: {
    light: { surface: 'bg-teal-300', text: 'text-teal-900' },
    strong: { surface: 'bg-teal-500', text: 'text-neutral-50' },
  },
  sky: {
    light: { surface: 'bg-sky-300', text: 'text-sky-900' },
    strong: { surface: 'bg-sky-500', text: 'text-neutral-50' },
  },
  blue: {
    light: { surface: 'bg-blue-300', text: 'text-blue-900' },
    strong: { surface: 'bg-blue-500', text: 'text-neutral-50' },
  },
  violet: {
    light: { surface: 'bg-violet-300', text: 'text-violet-900' },
    strong: { surface: 'bg-violet-500', text: 'text-neutral-50' },
  },
};

const isStyleHue = (hue: string | undefined): hue is StyleHue => STYLE_HUES.some((candidate) => candidate === hue);

/** The default look: the base surface, the base text and the separator border. */
const DEFAULT: HueClasses = { surface: 'bg-base-surface', text: '', border: 'border-separator' };

/**
 * The classes a hue at a tone draws with. Every tone keeps the hue's border; tone 0 drops the fill and
 * keeps the default text, and a tone a hue has no fills for draws as `medium` (its role pair).
 */
export const hueClasses = (hue: string | undefined, tone: NodeTone = DEFAULT_TONE): HueClasses => {
  const base = (hue && HUES[hue]) || DEFAULT;
  if (!hue || base === DEFAULT) {
    return base;
  }
  if (tone === 0) {
    return { surface: 'bg-transparent', text: '', border: base.border };
  }
  if ((tone === 1 || tone === 3) && isStyleHue(hue)) {
    return { ...TONE_FILLS[hue][tone === 1 ? 'strong' : 'light'], border: base.border };
  }
  return base;
};

/** `base` with every field `own` sets over it; an `undefined` field of `own` is unset, so it leaves the base's. */
const overlay = <T extends object>(base: T | undefined, own: T | undefined): T | undefined => {
  if (!base || !own) {
    return own ?? base;
  }
  const merged = { ...base };
  for (const [key, value] of Object.entries(own)) {
    if (value !== undefined) {
      Reflect.set(merged, key, value);
    }
  }
  return merged;
};

/** A node as drawn: its class's style under its own (`StyleClass`). */
export const classedNode = (node: Node, styles: StyleMap | undefined): Node => {
  const style = node.class ? styles?.[node.class]?.style : undefined;
  return style ? { ...node, style: overlay(style, node.style) } : node;
};

/** A link as drawn: its class's colour and line style under its own. */
export const classedLink = (link: Link, styles: StyleMap | undefined): Link => {
  const style = link.class ? styles?.[link.class]?.style : undefined;
  // A link draws only the common base (`LineStyle`) of its class's style.
  return style ? { ...link, style: overlay({ hue: style.hue, lineStyle: style.lineStyle }, link.style) } : link;
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
  // A scene shape drawing its contents is a window onto another canvas, so it is opaque even in outline: the
  // grid behind it would read as part of the child scene.
  const opaque = isPortalNode(node) && showsContents(node);
  const clear = !filled || hue.surface === 'bg-transparent';
  const surface = opaque && clear ? 'bg-base-surface' : filled ? hue.surface : '';
  return [
    surface,
    hue.text,
    selected
      ? 'border-primary-500'
      : hovered
        ? 'border-primary-500/50'
        : style.border === false && !style.guide
          ? 'border-transparent'
          : hue.border,
    style.guide || style.lineStyle === 'dashed' ? 'border-dashed' : style.lineStyle === 'dotted' ? 'border-dotted' : '',
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

export const lineClasses = (hue: string | undefined): LineClasses =>
  isStyleHue(hue) ? LINE_CLASSES[hue] : DEFAULT_LINE;

/**
 * Splits an edit of a classed element's look (`edited`, against what the panel `shown`): every field that changed
 * goes to the class, so each element of the class derives it, and the element drops its own value for that field,
 * which would otherwise hide the class's.
 */
export const splitClassEdit = <T extends object>(
  shown: object | undefined,
  edited: unknown,
  classLook: T,
  own: T | undefined,
): { classLook: T; own: T | undefined } => {
  const nextClass = { ...classLook };
  const nextOwn = own ? { ...own } : undefined;
  if (typeof edited === 'object' && edited !== null) {
    for (const [key, value] of Object.entries(edited)) {
      if (Reflect.get(shown ?? {}, key) !== value) {
        Reflect.set(nextClass, key, value);
        if (nextOwn) {
          Reflect.deleteProperty(nextOwn, key);
        }
      }
    }
  }
  return { classLook: nextClass, own: nextOwn };
};
