//
// Copyright 2026 DXOS.org
//

//
// The frame classes a node's `style` resolves to. Tailwind only emits classes it can read verbatim, so
// every hue is spelled out here rather than composed from the hue name.
//

import {
  type HorizontalAlign,
  type Link,
  type Node,
  type NodeStyle,
  type NodeTone,
  STYLE_HUES,
  type StyleHue,
  type StyleMap,
  type VerticalAlign,
  isEllipseNode,
  isViewNode,
  resolveStyle as resolveSceneStyle,
  showsContents,
} from '@dxos/scene';

import {
  DEFAULT_LOOK,
  type LookTone,
  type NeuRelief,
  type NodeSurface,
  type Opacity,
  type Radius,
  type SceneLook,
  type StyleVariant,
  styleVariant,
} from '../model/index.ts';
import {
  CANVAS_FILLS,
  DEFAULT_TEXT,
  NEAREST_HUE,
  NEU_CANVAS_FILL,
  RADIUS_CLASSES,
  type SetSurface,
  SURFACES,
  VIEW_FILLS,
} from './surfaces.ts';

/** A hue's classes. */
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

/** A node as drawn: its class's style under its own (`StyleClass`). */
export const classedNode = (node: Node, styles: StyleMap | undefined): Node => {
  const style = node.class ? styles?.[node.class]?.style : undefined;
  return style && node.class
    ? {
        ...node,
        style: resolveSceneStyle(
          { style: node.class, overrides: node.style },
          {},
          { styles: { [node.class]: style } },
          [],
          {},
        ),
      }
    : node;
};

/** A link as drawn: its class's colour, line style and caption size under its own. */
export const classedLink = (link: Link, styles: StyleMap | undefined): Link => {
  const style = link.class ? styles?.[link.class]?.style : undefined;
  // A link draws only what `LineStyle` shares with its class's style; an edit of a classed link writes there.
  return style && link.class
    ? {
        ...link,
        style: resolveSceneStyle(
          { style: link.class, overrides: link.style },
          {},
          { styles: { [link.class]: { hue: style.hue, lineStyle: style.lineStyle, fontSize: style.fontSize } } },
          [],
          {},
        ),
      }
    : link;
};

/**
 * A node's style with the defaults the frame draws spelled out: an unset `fill`, `border` or `rounded` is drawn (the
 * look's own corners), so the properties panel must show it as on rather than as an unset (off) toggle.
 */
export const resolveStyle = (style: NodeStyle = {}): NodeStyle => ({
  ...style,
  fill: style.fill ?? true,
  border: style.border ?? true,
  rounded: style.rounded ?? true,
});

type HueSurface = Exclude<NodeSurface, SetSurface>;

/** The canvas's own tone each of its surfaces draws with. */
const HUE_SURFACE_TONES: Record<HueSurface, NodeTone> = {
  'hue-clear': 0,
  'hue-strong': 1,
  'hue-role': 2,
  'hue-light': 3,
};

const isHueSurface = (surface: NodeSurface): surface is HueSurface => Object.hasOwn(HUE_SURFACE_TONES, surface);

/**
 * The classes a hue draws with in `variant`: the canvas's own tone fills (`hueClasses`) for its `hue-*` surfaces,
 * otherwise the variant's surface for the hue (a theme hue outside the pickers draws as the nearest picker hue).
 */
export const variantClasses = (
  hue: string | undefined,
  variant: StyleVariant,
  tone: LookTone = 'theme',
): HueClasses => {
  const { surface, label } = variant;
  if (isHueSurface(surface)) {
    return hueClasses(hue, HUE_SURFACE_TONES[surface]);
  }
  const key = hue === undefined ? 'default' : isStyleHue(hue) ? hue : NEAREST_HUE[hue];
  const classes = SURFACES[surface][key ?? 'default'][tone];
  return { ...classes, text: label === 'default' ? DEFAULT_TEXT[tone] : classes.text };
};

/** The classes a hue at a tone draws with in `look`'s style set: the set's variant for the tone. */
export const surfaceClasses = (
  hue: string | undefined,
  tone: NodeTone | undefined,
  look: SceneLook = DEFAULT_LOOK,
): HueClasses => variantClasses(hue, styleVariant(look.styleSet, tone), look.tone);

/**
 * Frame classes for a node in `look` (the default flat look when unset): fill and text colour, border and corner radius from
 * its style; a guide is dashed and unfilled. `ellipse` rounds it as an ellipse whatever the node's type (its
 * definition asks for it).
 */
export const frameClasses = (
  node: Node,
  selected: boolean,
  hovered = false,
  ellipse = false,
  look: SceneLook = DEFAULT_LOOK,
): string[] => {
  const style = resolveStyle(node.style);
  const tokens = styleVariant(look.styleSet, style.tone);
  const hue = variantClasses(style.hue, tokens, look.tone);
  const { view } = look.styleSet;
  const filled = style.fill && !style.guide;
  // A view node drawing its contents is a window onto another canvas, so it is opaque even in outline: the
  // grid behind it would read as part of the child scene.
  const opaque = isViewNode(node) && showsContents(node);
  const clear = !filled || hue.surface === 'bg-transparent';
  const surface = opaque && clear ? VIEW_FILLS[view.contents][look.tone] : filled ? hue.surface : '';
  const lineStyle = style.lineStyle ?? tokens.borderStyle;
  return [
    surface,
    // A guide's hue marks its edge (a group's backdrop); its title reads in the default text colour.
    style.guide ? '' : hue.text,
    selected
      ? 'border-focus'
      : hovered
        ? 'border-focus/50'
        : // A frame always shows its edge: it bounds a scene or an embedded object, which has none of its own.
          style.border === false && !style.guide && !isViewNode(node)
          ? 'border-transparent'
          : hue.border,
    style.guide || lineStyle === 'dashed' ? 'border-dashed' : lineStyle === 'dotted' ? 'border-dotted' : '',
    ellipse || isEllipseNode(node) ? 'rounded-[50%]' : RADIUS_CLASSES[cornerRadius(node.style, tokens)],
  ];
};

/**
 * The corner a style asks for in a look's variant: off is square, on is the look's rounded radius, and unset is the
 * look's own corner, so the toggle's two states always differ.
 */
export const cornerRadius = (
  style: NodeStyle | undefined,
  tokens: Pick<StyleVariant, 'radius' | 'roundedRadius'>,
): Radius => (style?.rounded === false ? 'none' : style?.rounded ? tokens.roundedRadius : tokens.radius);

/**
 * The canvas colour in SVG, under a link's caption and inside a hollow end marker: the Neu ground on the Neu
 * background, else the canvas's own surface.
 */
export const canvasFillClass = (look: SceneLook, opacity: Opacity): string =>
  look.background.surface === 'neu' ? NEU_CANVAS_FILL : CANVAS_FILLS[opacity][look.tone];

const SURFACE_RELIEF: Partial<Record<NodeSurface, NeuRelief>> = {
  'neu-raised': 'raised',
  'neu-inset': 'inset',
};

/**
 * The Neu relief a filled node stands in by its tone, for a shape drawn as a silhouette (its box-shadow would be
 * masked away with the box); none for a flat or unfilled shape or another style set. Selection never changes it.
 */
export const nodeRelief = (node: Node, look: SceneLook = DEFAULT_LOOK): NeuRelief | undefined => {
  const style = resolveStyle(node.style);
  if (!style.fill || style.guide) {
    return undefined;
  }
  return SURFACE_RELIEF[styleVariant(look.styleSet, style.tone).surface];
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

const HORIZONTAL_CLASSES: Record<HorizontalAlign, string> = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
};

const VERTICAL_CLASSES: Record<VerticalAlign, string> = {
  top: 'justify-start',
  middle: 'justify-center',
  bottom: 'justify-end',
};

/**
 * Classes placing a text part in its shape by the style's alignment, else by the type's own (`defaults`): the part
 * is a column, so `justify` places it down the shape and `items` across it.
 */
export const alignClasses = (
  style: NodeStyle | undefined,
  defaults: { horizontal: HorizontalAlign; vertical: VerticalAlign },
): string =>
  `flex flex-col ${HORIZONTAL_CLASSES[style?.alignHorizontal ?? defaults.horizontal]} ${
    VERTICAL_CLASSES[style?.alignVertical ?? defaults.vertical]
  }`;
