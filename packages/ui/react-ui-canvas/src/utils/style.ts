//
// Copyright 2026 DXOS.org
//

//
// The frame classes a node's look resolves to. Tailwind only emits classes it can read verbatim, so
// every hue is spelled out here rather than composed from the hue name.
//

import type { CSSProperties } from 'react';

import {
  type Align,
  DEFAULT_COLOR,
  type Link,
  type Node,
  type NodeTone,
  type Style2D,
  STYLE_HUES,
  type StyleHue,
  type StyleMap,
  TEXT_TONES,
  type TextTone,
  type VerticalAlign,
  colorTone,
  isEllipseNode,
  isViewNode,
  resolveColor,
  resolveFont,
  resolveStyle as resolveSceneStyle,
  showsContents,
  strokeDash,
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

/** A text colour as it is drawn, and the swatch that offers it. */
export type TextColor = { text: string; swatch: string };

/** The tone a text colour takes when its style names a hue alone. */
export const DEFAULT_TEXT_TONE: TextTone = 2;

/**
 * Each style hue as a text colour at its three tones, light to dark: the palette's 300, 500 and 700, so a text set in
 * a hue can be made to stand out or sit back on either canvas.
 */
export const TEXT_COLORS: Record<StyleHue, readonly [TextColor, TextColor, TextColor]> = {
  neutral: [
    { text: 'text-neutral-300', swatch: 'bg-neutral-300' },
    { text: 'text-neutral-500', swatch: 'bg-neutral-500' },
    { text: 'text-neutral-700', swatch: 'bg-neutral-700' },
  ],
  red: [
    { text: 'text-red-300', swatch: 'bg-red-300' },
    { text: 'text-red-500', swatch: 'bg-red-500' },
    { text: 'text-red-700', swatch: 'bg-red-700' },
  ],
  orange: [
    { text: 'text-orange-300', swatch: 'bg-orange-300' },
    { text: 'text-orange-500', swatch: 'bg-orange-500' },
    { text: 'text-orange-700', swatch: 'bg-orange-700' },
  ],
  amber: [
    { text: 'text-amber-300', swatch: 'bg-amber-300' },
    { text: 'text-amber-500', swatch: 'bg-amber-500' },
    { text: 'text-amber-700', swatch: 'bg-amber-700' },
  ],
  green: [
    { text: 'text-green-300', swatch: 'bg-green-300' },
    { text: 'text-green-500', swatch: 'bg-green-500' },
    { text: 'text-green-700', swatch: 'bg-green-700' },
  ],
  teal: [
    { text: 'text-teal-300', swatch: 'bg-teal-300' },
    { text: 'text-teal-500', swatch: 'bg-teal-500' },
    { text: 'text-teal-700', swatch: 'bg-teal-700' },
  ],
  sky: [
    { text: 'text-sky-300', swatch: 'bg-sky-300' },
    { text: 'text-sky-500', swatch: 'bg-sky-500' },
    { text: 'text-sky-700', swatch: 'bg-sky-700' },
  ],
  blue: [
    { text: 'text-blue-300', swatch: 'bg-blue-300' },
    { text: 'text-blue-500', swatch: 'bg-blue-500' },
    { text: 'text-blue-700', swatch: 'bg-blue-700' },
  ],
  violet: [
    { text: 'text-violet-300', swatch: 'bg-violet-300' },
    { text: 'text-violet-500', swatch: 'bg-violet-500' },
    { text: 'text-violet-700', swatch: 'bg-violet-700' },
  ],
};

/** The colour a text hue draws at a tone; none for a name that is no style hue. */
export const textColor = (hue: string | undefined, tone: TextTone = DEFAULT_TEXT_TONE): TextColor | undefined =>
  isStyleHue(hue) ? TEXT_COLORS[hue][tone - 1] : undefined;

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

/** A tone a colour states as one a node draws at: any past the lightest draws as the lightest. */
const nodeTone = (tone: number | undefined): NodeTone | undefined =>
  tone === undefined ? undefined : TONES.find((candidate) => candidate === Math.min(tone, 3));

/**
 * A colour as `look` draws it, resolved through the look's theme slots: a hue (none for the look's own colour) and
 * the tone it states, or a CSS literal, which keeps the tone its name was stated at.
 */
export const drawnColor = (
  color: string | undefined,
  look: SceneLook = DEFAULT_LOOK,
): { hue?: string; tone?: NodeTone; css?: string } => {
  const value = resolveColor(color, look.theme);
  if (!value) {
    return {};
  }
  const tone = nodeTone(value.kind === 'name' ? value.tone : colorTone(color));
  return {
    ...(value.kind === 'css' ? { css: value.css } : value.name !== DEFAULT_COLOR ? { hue: value.name } : {}),
    ...(tone !== undefined ? { tone } : {}),
  };
};

/** The tone a style's colour and fill draw at: a tint is the lightest fill of whatever colour it washes. */
const drawnTone = (style: Style2D, tone: NodeTone | undefined): NodeTone | undefined =>
  style.fill === 'tint' ? 3 : tone;

/** The variant of the look's style set a node draws in: the tone its colour and fill draw at picks it. */
export const nodeVariant = (node: Node, look: SceneLook = DEFAULT_LOOK): StyleVariant =>
  styleVariant(look.styleSet, drawnTone(node.overrides ?? {}, drawnColor(node.overrides?.color, look).tone));

/** A node as drawn: its named style's look under its own (`StyleClass`). */
export const classedNode = (node: Node, styles: StyleMap | undefined): Node => {
  const style = node.style ? styles?.[node.style]?.style : undefined;
  return style && node.style
    ? {
        ...node,
        overrides: resolveSceneStyle(
          { style: node.style, overrides: node.overrides },
          {},
          { styles: { [node.style]: style } },
          [],
          {},
        ),
      }
    : node;
};

/** A link as drawn: its named style's colour, stroke and caption size under its own. */
export const classedLink = (link: Link, styles: StyleMap | undefined): Link => {
  const style = link.style ? styles?.[link.style]?.style : undefined;
  // A link draws only what `LineStyle` shares with its named style; an edit of a classed link writes there.
  return style && link.style
    ? {
        ...link,
        overrides: resolveSceneStyle(
          { style: link.style, overrides: link.overrides },
          {},
          { styles: { [link.style]: { color: style.color, stroke: style.stroke, fontSize: style.fontSize } } },
          [],
          {},
        ),
      }
    : link;
};

/**
 * A node as its kind draws it where its look sets no fill or stroke: a `bare` kind draws neither, since it draws
 * all it shows, and an `outline` kind draws its border alone. The properties panel reads the same node, so a toggle
 * shows what is drawn.
 */
export const bareNode = (node: Node, def: { bare?: boolean; outline?: boolean } | undefined): Node =>
  def?.bare
    ? { ...node, overrides: { fill: 'none', stroke: 'none', ...node.overrides } }
    : def?.outline
      ? { ...node, overrides: { fill: 'none', ...node.overrides } }
      : node;

/**
 * A node's look with the defaults the frame draws spelled out: an unset `fill` or `corners` is drawn (the look's own
 * corners), so the properties panel must show it as on rather than as an unset (off) toggle.
 */
export const resolveStyle = (style: Style2D = {}): Style2D => ({
  ...style,
  fill: style.fill ?? 'solid',
  corners: style.corners ?? 'all',
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
 * Whether a node's look draws no border. A guide and a view node always show their edge: a view bounds a scene or an
 * embedded object, which has none of its own.
 */
const hidesBorder = (node: Node, style: Style2D): boolean =>
  style.stroke === 'none' && !style.guide && !isViewNode(node);

/**
 * Frame classes for a node in `look` (the default flat look when unset): fill and text colour, border and corner radius from
 * its look; a guide is dashed and unfilled. `ellipse` rounds it as an ellipse whatever the node's kind (its
 * definition asks for it). A colour that is a CSS literal has no classes, so `frameStyle` states its fill and border.
 */
export const frameClasses = (
  node: Node,
  selected: boolean,
  hovered = false,
  ellipse = false,
  look: SceneLook = DEFAULT_LOOK,
): string[] => {
  const style = resolveStyle(node.overrides);
  const drawn = drawnColor(style.color, look);
  const literal = drawn.css !== undefined;
  const tone = drawnTone(style, drawn.tone);
  const tokens = styleVariant(look.styleSet, tone);
  const hue = variantClasses(drawn.hue, tokens, look.tone);
  const { view } = look.styleSet;
  const filled = style.fill !== 'none' && !style.guide;
  // A view node drawing its contents is a window onto another canvas, so it is opaque even in outline: the
  // grid behind it would read as part of the child scene.
  const opaque = isViewNode(node) && showsContents(node);
  const clear = !filled || (literal ? tone === 0 : hue.surface === 'bg-transparent');
  const surface = opaque && clear ? VIEW_FILLS[view.contents][look.tone] : filled && !literal ? hue.surface : '';
  const dash = strokeDash(style.stroke) ?? tokens.borderStyle;
  // A text colour of its own wins over the one the shape's hue and fill give the text.
  const text = textStyleColor(style, look).className ?? hue.text;
  return [
    surface,
    // A guide's hue marks its edge (a group's backdrop); its title reads in the default text colour.
    style.guide ? '' : text,
    selected
      ? 'border-focus'
      : hovered
        ? 'border-focus/50'
        : hidesBorder(node, style)
          ? 'border-transparent'
          : literal
            ? ''
            : hue.border,
    style.guide || dash === 'dashed' ? 'border-dashed' : dash === 'dotted' ? 'border-dotted' : '',
    ellipse || isEllipseNode(node) ? 'rounded-[50%]' : RADIUS_CLASSES[cornerRadius(node.overrides, tokens)],
  ];
};

/** How much of a literal colour a fill mixes in at each tone, as a percentage; tone 0 has no fill. */
const LITERAL_FILL: Record<Exclude<NodeTone, 0>, number> = { 1: 100, 2: 40, 3: 20 };

/**
 * The inline colours of a node whose colour is a CSS literal, which no class can state: its border in the literal and
 * its fill a mix of it by tone. None for a theme colour, which `frameClasses` draws.
 */
export const frameStyle = (node: Node, look: SceneLook = DEFAULT_LOOK): CSSProperties | undefined => {
  const style = node.overrides ?? {};
  const { css, tone: stated } = drawnColor(style.color, look);
  if (css === undefined) {
    return undefined;
  }
  const tone = drawnTone(style, stated) ?? DEFAULT_TONE;
  const filled = style.fill !== 'none' && !style.guide && tone !== 0;
  return {
    ...(hidesBorder(node, style) ? {} : { borderColor: css }),
    ...(filled ? { backgroundColor: `color-mix(in srgb, ${css} ${LITERAL_FILL[tone]}%, transparent)` } : {}),
  };
};

/**
 * The colour a style gives its text alone: a class for a theme colour at its text tone, or a CSS literal the caller
 * sets inline. Neither when the style names none, so the text takes the colour the shape's colour and fill give it.
 */
export const textStyleColor = (
  style: Style2D | undefined,
  look: SceneLook = DEFAULT_LOOK,
): { className?: string; css?: string } => {
  const value = resolveColor(style?.textColor, look.theme);
  if (value?.kind === 'css') {
    return { css: value.css };
  }
  const tone = TEXT_TONES.find((candidate) => candidate === value?.tone) ?? DEFAULT_TEXT_TONE;
  const className = textColor(value?.name, tone)?.text;
  return className !== undefined ? { className } : {};
};

/**
 * The CSS `font-family` of the theme slot a style sets its text in; none when it names no slot, so the text inherits
 * the face around it.
 */
export const fontFamily = (
  style: Pick<Style2D, 'font'> | undefined,
  look: SceneLook = DEFAULT_LOOK,
): string | undefined => (style?.font === undefined ? undefined : resolveFont(style.font, look.theme));

/**
 * The corner a look asks for in a look's variant: `none` is square, any other value is the look's rounded radius, and
 * unset is the look's own corner, so the toggle's two states always differ.
 */
export const cornerRadius = (
  style: Pick<Style2D, 'corners'> | undefined,
  tokens: Pick<StyleVariant, 'radius' | 'roundedRadius'>,
): Radius => (style?.corners === 'none' ? 'none' : style?.corners !== undefined ? tokens.roundedRadius : tokens.radius);

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
  const style = resolveStyle(node.overrides);
  if (style.fill === 'none' || style.guide) {
    return undefined;
  }
  return SURFACE_RELIEF[styleVariant(look.styleSet, drawnTone(style, drawnColor(style.color, look).tone)).surface];
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
 * A link's stroke and its end markers' fill for its colour in `look`: the hue's classes for a theme colour; for a CSS
 * literal the default line's classes and the literal, which the caller sets as `stroke` and `fill` inline.
 */
export const lineColor = (
  color: string | undefined,
  look: SceneLook = DEFAULT_LOOK,
): { classes: LineClasses; css?: string } => {
  const { hue, css } = drawnColor(color, look);
  return css !== undefined ? { classes: DEFAULT_LINE, css } : { classes: lineClasses(hue) };
};

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

const HORIZONTAL_CLASSES: Record<Align, string> = {
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
 * Classes placing a text part in its shape by the look's alignment, else by the kind's own (`defaults`): the part
 * is a column, so `justify` places it down the shape and `items` across it.
 */
export const alignClasses = (
  style: Pick<Style2D, 'align' | 'valign'> | undefined,
  defaults: { horizontal: Align; vertical: VerticalAlign },
): string =>
  `flex flex-col ${HORIZONTAL_CLASSES[style?.align ?? defaults.horizontal]} ${
    VERTICAL_CLASSES[style?.valign ?? defaults.vertical]
  }`;
