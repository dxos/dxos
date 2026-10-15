//
// Copyright 2026 DXOS.org
//

//
// Style sets and backgrounds: a drawing's visual theme, independent of what it contains. Both are plain data
// resolved by id through a registry, so a host can add its own (and later store user-defined ones in ECHO)
// without the renderer changing. Tokens are semantic (a fill strategy, a radius step, a link kind) rather
// than class names, since Tailwind only emits classes it reads verbatim in source; the renderer maps each
// token to literal classes (`utils/surfaces.ts`).
//

import * as Schema from 'effect/Schema';

import { LINE_STYLES, StyleHue } from './types.ts';

/**
 * How a hue fills a node: `tone`, the canvas's own hue and tone fills; `muted`, a soft solid fill; `outline`, no fill
 * and a hue border; `tint`, a translucent hue tint with a light edge.
 */
export const NodeSurface = Schema.Literals(['tone', 'muted', 'outline', 'tint']);
export type NodeSurface = Schema.Schema.Type<typeof NodeSurface>;

/** A corner radius step. */
export const Radius = Schema.Literals(['none', 'sm', 'md', 'lg', 'xl', '2xl']);
export type Radius = Schema.Schema.Type<typeof Radius>;

/**
 * How a link is drawn: `line`, a single stroke; `tube`, a shaded strip; `rails`, two edges over a faint strip;
 * `glass`, a translucent strip with fine edges.
 */
export const LinkKind = Schema.Literals(['line', 'tube', 'rails', 'glass']);
export type LinkKind = Schema.Schema.Type<typeof LinkKind>;

/** Whether a surface hides what is behind it or lets it show through. */
export const Opacity = Schema.Literals(['opaque', 'translucent']);
export type Opacity = Schema.Schema.Type<typeof Opacity>;

export const StyleSet = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  node: Schema.Struct({
    surface: NodeSurface,
    /** Border width in scene px. */
    borderWidth: Schema.Literals([1, 2]),
    /** The border of a node that sets no line style of its own. */
    borderStyle: Schema.Literals(LINE_STYLES),
    /** Corners of a node, and of one whose style asks to be rounded. */
    radius: Radius,
    roundedRadius: Radius,
    /** Label colour: the surface's own text colour for its hue, or the default text colour. */
    label: Schema.Literals(['surface', 'default']),
  }),
  link: Schema.Struct({
    kind: LinkKind,
    /** Stroke width in scene px (the whole strip for a tube, rails or glass). */
    width: Schema.Number.check(Schema.isGreaterThan(0)),
    /** The backdrop behind a link's caption. */
    caption: Opacity,
  }),
  frame: Schema.Struct({
    /** The fill of a frame showing its child scene, which must hide the grid behind it. */
    contents: Opacity,
  }),
  /** The background drawn under the scene unless the user or drawing picks another. */
  background: Schema.String,
});
export interface StyleSet extends Schema.Schema.Type<typeof StyleSet> {}

/** A broad radial colour wash: its hue, centre (0 to 1 across the field), strongest opacity and radius. */
export const Wash = Schema.Struct({
  hue: StyleHue,
  x: Schema.Number,
  y: Schema.Number,
  strength: Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 })),
  /** Radius as a fraction of the field; 0.75 when unset. */
  radius: Schema.optional(Schema.Number),
});
export interface Wash extends Schema.Schema.Type<typeof Wash> {}

/** The pattern a background draws on the scene's grid: dots on the minor grid, minor and major lines, or none. */
export const BackgroundGrid = Schema.Literals(['none', 'dots', 'lines']);
export type BackgroundGrid = Schema.Schema.Type<typeof BackgroundGrid>;

/**
 * Whether a background reads as light or dark, which picks the style set's light or dark tokens; unset, both follow the
 * app's theme.
 */
export const BackgroundTone = Schema.Literals(['light', 'dark']);
export type BackgroundTone = Schema.Schema.Type<typeof BackgroundTone>;

export const Background = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  tone: Schema.optional(BackgroundTone),
  /** The canvas fill: the theme's base surface, or warm paper. */
  surface: Schema.Literals(['base', 'paper']),
  grid: BackgroundGrid,
  washes: Schema.Array(Wash),
  /** The field fades out towards its edges rather than ending at the scene's padded bounds. */
  fade: Schema.Boolean,
  /** Opacity (0 to 1) of each pixel of a screen-space noise overlay; 0 draws none. */
  grain: Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 })),
  /** The noise's colour: gray, or warm like paper fibre. */
  grainHue: Schema.optional(Schema.Literals(['neutral', 'warm'])),
});
export interface Background extends Schema.Schema.Type<typeof Background> {}

//
// Built-ins.
//

/** Today's look; existing drawings render with it unchanged. */
export const CLASSIC_STYLE_SET: StyleSet = {
  id: 'classic',
  name: 'Classic',
  node: { surface: 'tone', borderWidth: 2, borderStyle: 'solid', radius: 'sm', roundedRadius: '2xl', label: 'surface' },
  link: { kind: 'line', width: 2, caption: 'opaque' },
  frame: { contents: 'opaque' },
  background: 'plain',
};

export const FLAT_STYLE_SET: StyleSet = {
  id: 'flat',
  name: 'Flat',
  node: { surface: 'muted', borderWidth: 1, borderStyle: 'solid', radius: 'md', roundedRadius: 'xl', label: 'surface' },
  link: { kind: 'line', width: 3, caption: 'opaque' },
  frame: { contents: 'opaque' },
  background: 'plain',
};

export const OUTLINE_STYLE_SET: StyleSet = {
  id: 'outline',
  name: 'Outline',
  node: {
    surface: 'outline',
    borderWidth: 2,
    borderStyle: 'solid',
    radius: 'md',
    roundedRadius: '2xl',
    label: 'default',
  },
  link: { kind: 'rails', width: 8, caption: 'translucent' },
  frame: { contents: 'translucent' },
  background: 'dots',
};

export const GLASS_STYLE_SET: StyleSet = {
  id: 'glass',
  name: 'Glass',
  node: { surface: 'tint', borderWidth: 1, borderStyle: 'solid', radius: 'lg', roundedRadius: '2xl', label: 'surface' },
  link: { kind: 'glass', width: 8, caption: 'translucent' },
  frame: { contents: 'translucent' },
  background: 'glow',
};

export const PLAIN_BACKGROUND: Background = {
  id: 'plain',
  name: 'Plain',
  surface: 'base',
  grid: 'none',
  washes: [],
  fade: false,
  grain: 0,
};

export const DOTS_BACKGROUND: Background = { ...PLAIN_BACKGROUND, id: 'dots', name: 'Dots', grid: 'dots' };

export const LINES_BACKGROUND: Background = { ...PLAIN_BACKGROUND, id: 'lines', name: 'Lines', grid: 'lines' };

/** Two broad colour washes over dots, fading at the edges, with grain to dither the dim gradients' bands. */
export const GLOW_BACKGROUND: Background = {
  id: 'glow',
  name: 'Glow',
  surface: 'base',
  grid: 'dots',
  washes: [
    { hue: 'violet', x: 0.2, y: 0.15, strength: 0.22 },
    { hue: 'teal', x: 0.85, y: 0.9, strength: 0.22 },
  ],
  fade: true,
  grain: 16 / 255,
};

/** Warm off-white paper with a fine fibre grain and faint dots. */
export const PAPER_BACKGROUND: Background = {
  id: 'paper',
  name: 'Paper',
  tone: 'light',
  surface: 'paper',
  grid: 'dots',
  washes: [],
  fade: false,
  grain: 28 / 255,
  grainHue: 'warm',
};

export const DEFAULT_STYLE_SETS: Readonly<Record<string, StyleSet>> = {
  classic: CLASSIC_STYLE_SET,
  flat: FLAT_STYLE_SET,
  outline: OUTLINE_STYLE_SET,
  glass: GLASS_STYLE_SET,
};

export const DEFAULT_BACKGROUNDS: Readonly<Record<string, Background>> = {
  plain: PLAIN_BACKGROUND,
  dots: DOTS_BACKGROUND,
  lines: LINES_BACKGROUND,
  glow: GLOW_BACKGROUND,
  paper: PAPER_BACKGROUND,
};

/** The ids of the built-in style sets and backgrounds, for pickers. */
export const STYLE_SET_IDS = ['classic', 'flat', 'outline', 'glass'] as const;
export const BACKGROUND_IDS = ['plain', 'dots', 'lines', 'glow', 'paper'] as const;

//
// Registry.
//

/** The style sets and backgrounds a view resolves ids against. */
export type StyleSetRegistry = {
  readonly styleSets: Readonly<Record<string, StyleSet>>;
  readonly backgrounds: Readonly<Record<string, Background>>;
};

/** A registry of the built-ins plus `extra`, whose entries win over a built-in of the same id. */
export const createStyleSetRegistry = (extra: Partial<StyleSetRegistry> = {}): StyleSetRegistry => ({
  styleSets: { ...DEFAULT_STYLE_SETS, ...extra.styleSets },
  backgrounds: { ...DEFAULT_BACKGROUNDS, ...extra.backgrounds },
});

export const defaultStyleSetRegistry: StyleSetRegistry = createStyleSetRegistry();

/** Which tokens a look draws with: the light or dark variant, or (`theme`) whichever the app's theme is. */
export type LookTone = 'theme' | 'light' | 'dark';

/** A style set and background resolved for drawing. */
export type SceneLook = {
  readonly styleSet: StyleSet;
  readonly background: Background;
  readonly tone: LookTone;
};

/** The look of a view that names neither: the classic set on the plain background. */
export const DEFAULT_LOOK: SceneLook = { styleSet: CLASSIC_STYLE_SET, background: PLAIN_BACKGROUND, tone: 'theme' };

/** The style set `id` names, else classic: an unknown id (from a newer host, or a deleted set) still draws. */
export const resolveStyleSet = (registry: StyleSetRegistry, id: string | undefined): StyleSet =>
  (id !== undefined ? registry.styleSets[id] : undefined) ?? CLASSIC_STYLE_SET;

/** The background `id` names, else the style set's own, else plain. */
export const resolveBackground = (
  registry: StyleSetRegistry,
  id: string | undefined,
  styleSet: StyleSet = CLASSIC_STYLE_SET,
): Background =>
  (id !== undefined ? registry.backgrounds[id] : undefined) ??
  registry.backgrounds[styleSet.background] ??
  PLAIN_BACKGROUND;

/** The look a view draws with for a style set id and a background id, either of which may be unset. */
export const resolveLook = (
  registry: StyleSetRegistry,
  styleSetId: string | undefined,
  backgroundId: string | undefined,
): SceneLook => {
  const styleSet = resolveStyleSet(registry, styleSetId);
  const background = resolveBackground(registry, backgroundId, styleSet);
  return { styleSet, background, tone: background.tone ?? 'theme' };
};
