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

import { LINE_STYLES, StyleHue } from '@dxos/scene';

/**
 * How a hue fills a node. `hue-clear`, `hue-strong`, `hue-role` and `hue-light` are the canvas's own tones (outline,
 * strong, medium, light); `muted-subtle`, `muted` and `muted-solid` are soft to firm solid fills, `muted-clear` the subtle edge with no fill; `outline` draws no
 * fill and a hue border; `glass-clear`, `glass-frost`, `glass-tint` and `glass-solid` run from an edge alone to an
 * opaque glass colour; `soft-flat`, `soft-inset` and `soft-raised` are the soft ground flush with, cut into, or raised out of
 * the background by dual shadows, the hue marking only the border and label.
 */
export const NodeSurface = Schema.Literals([
  'hue-clear',
  'hue-strong',
  'hue-role',
  'hue-light',
  'muted-clear',
  'muted-subtle',
  'muted',
  'muted-solid',
  'outline',
  'glass-clear',
  'glass-frost',
  'glass-tint',
  'glass-solid',
  'soft-flat',
  'soft-inset',
  'soft-raised',
]);
export type NodeSurface = Schema.Schema.Type<typeof NodeSurface>;

/** A corner radius step. */
export const Radius = Schema.Literals(['none', 'sm', 'md', 'lg', 'xl', '2xl']);
export type Radius = Schema.Schema.Type<typeof Radius>;

/** Each radius step in px, as the theme's `rounded-*` classes draw it. */
export const RADIUS_PX: Record<Radius, number> = { 'none': 0, 'sm': 4, 'md': 6, 'lg': 8, 'xl': 12, '2xl': 16 };

/**
 * How a link is drawn: `line`, a single stroke; `tube`, a shaded strip; `rails`, two edges over a faint strip;
 * `glass`, a translucent strip with fine edges; `groove`, a channel pressed into the soft ground.
 */
export const LinkKind = Schema.Literals(['line', 'tube', 'rails', 'glass', 'groove']);
export type LinkKind = Schema.Schema.Type<typeof LinkKind>;

/** Whether a surface hides what is behind it or lets it show through. */
export const Opacity = Schema.Literals(['opaque', 'translucent']);
export type Opacity = Schema.Schema.Type<typeof Opacity>;

/**
 * One way a style set draws a node: a node's `style.tone` (0 to 3) picks the set's variant at that index (the last one
 * past the end), so a drawing keeps its choices whichever set draws it.
 */
export const StyleVariant = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  surface: NodeSurface,
  /** Border width in scene px. */
  borderWidth: Schema.Literals([1, 2, 4]),
  /** The border of a node that sets no line style of its own. */
  borderStyle: Schema.Literals(LINE_STYLES),
  /** Corners of a node, and of one whose style asks to be rounded. */
  radius: Radius,
  roundedRadius: Radius,
  /** Label colour: the surface's own text colour for its hue, or the default text colour. */
  label: Schema.Literals(['surface', 'default']),
});
export interface StyleVariant extends Schema.Schema.Type<typeof StyleVariant> {}

export const StyleSet = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  /** Two to four ways to draw a node, picked by its tone. */
  variants: Schema.Array(StyleVariant).check(Schema.isMinLength(2), Schema.isMaxLength(4)),
  /** The variant a node with no tone draws as. */
  defaultVariant: Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 0, maximum: 3 })),
  link: Schema.Struct({
    kind: LinkKind,
    /** Stroke width in scene px (the whole strip for a tube, rails or glass). */
    width: Schema.Number.check(Schema.isGreaterThan(0)),
    /** The backdrop behind a link's caption. */
    caption: Opacity,
  }),
  view: Schema.Struct({
    /** The fill of a view node showing its child View, which must hide the grid behind it. */
    contents: Opacity,
  }),
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

export const Background = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  /** The canvas fill: the theme's base surface, warm paper, the near-black of a film's frame, or the soft ground. */
  surface: Schema.Literals(['base', 'paper', 'film', 'soft']),
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

/** Light or dark: which of a style set's tokens draw, and the colour scheme the canvas takes. */
export const ThemeMode = Schema.Literals(['light', 'dark']);
export type ThemeMode = Schema.Schema.Type<typeof ThemeMode>;

/**
 * A canvas theme: a style set on a background, by id. With a `mode` the canvas takes that mode whatever the app's;
 * without, it follows the app.
 */
export const Theme = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  styleSet: Schema.String,
  background: Schema.String,
  mode: Schema.optional(ThemeMode),
});
export interface Theme extends Schema.Schema.Type<typeof Theme> {}

//
// Built-ins.
//

const CLASSIC_SHAPE = {
  borderWidth: 2,
  borderStyle: 'solid',
  radius: 'sm',
  roundedRadius: '2xl',
  label: 'surface',
} as const;

/** The canvas's look before style sets, its variants the four tones; kept for nodes drawn outside any look, not offered. */
export const CLASSIC_STYLE_SET: StyleSet = {
  id: 'classic',
  name: 'Classic',
  variants: [
    { id: 'outline', name: 'Outline', surface: 'hue-clear', ...CLASSIC_SHAPE },
    { id: 'strong', name: 'Strong', surface: 'hue-strong', ...CLASSIC_SHAPE },
    { id: 'medium', name: 'Medium', surface: 'hue-role', ...CLASSIC_SHAPE },
    { id: 'light', name: 'Light', surface: 'hue-light', ...CLASSIC_SHAPE },
  ],
  defaultVariant: 2,
  link: { kind: 'line', width: 2, caption: 'opaque' },
  view: { contents: 'opaque' },
};

const FLAT_SHAPE = {
  borderWidth: 4,
  borderStyle: 'solid',
  radius: 'md',
  roundedRadius: 'xl',
  label: 'surface',
} as const;

/** Unfilled first, like every set's tone 0, so a tone reads the same whichever set draws it. */
export const FLAT_STYLE_SET: StyleSet = {
  id: 'flat',
  name: 'Flat',
  variants: [
    { id: 'clear', name: 'Clear', surface: 'muted-clear', ...FLAT_SHAPE },
    { id: 'subtle', name: 'Subtle', surface: 'muted-subtle', ...FLAT_SHAPE },
    { id: 'muted', name: 'Muted', surface: 'muted', ...FLAT_SHAPE },
    { id: 'solid', name: 'Solid', surface: 'muted-solid', ...FLAT_SHAPE },
  ],
  defaultVariant: 2,
  link: { kind: 'line', width: 3, caption: 'opaque' },
  view: { contents: 'opaque' },
};

const OUTLINE_SHAPE = { surface: 'outline', radius: 'md', roundedRadius: '2xl', label: 'default' } as const;

export const OUTLINE_STYLE_SET: StyleSet = {
  id: 'outline',
  name: 'Outline',
  variants: [
    { id: 'hairline', name: 'Hairline', borderWidth: 1, borderStyle: 'solid', ...OUTLINE_SHAPE },
    { id: 'bold', name: 'Bold', borderWidth: 2, borderStyle: 'solid', ...OUTLINE_SHAPE },
    { id: 'dashed', name: 'Dashed', borderWidth: 2, borderStyle: 'dashed', ...OUTLINE_SHAPE },
  ],
  defaultVariant: 0,
  link: { kind: 'rails', width: 8, caption: 'translucent' },
  view: { contents: 'translucent' },
};

const GLASS_SHAPE = {
  borderWidth: 1,
  borderStyle: 'solid',
  radius: 'lg',
  roundedRadius: '2xl',
  label: 'surface',
} as const;

export const GLASS_STYLE_SET: StyleSet = {
  id: 'glass',
  name: 'Glass',
  variants: [
    { id: 'clear', name: 'Clear', surface: 'glass-clear', ...GLASS_SHAPE },
    { id: 'frost', name: 'Frost', surface: 'glass-frost', ...GLASS_SHAPE },
    { id: 'tint', name: 'Tint', surface: 'glass-tint', ...GLASS_SHAPE },
    { id: 'solid', name: 'Solid', surface: 'glass-solid', ...GLASS_SHAPE },
  ],
  defaultVariant: 1,
  link: { kind: 'glass', width: 8, caption: 'translucent' },
  view: { contents: 'translucent' },
};

const SOFT_SHAPE = {
  borderWidth: 1,
  borderStyle: 'solid',
  radius: 'xl',
  roundedRadius: '2xl',
  label: 'surface',
} as const;

/** Neumorphism: every shape is the ground, flush, cut in or (by default) raised; the hue is only an accent. */
export const SOFT_STYLE_SET: StyleSet = {
  id: 'soft',
  name: 'Soft',
  variants: [
    { id: 'inset', name: 'Inset', surface: 'soft-inset', ...SOFT_SHAPE },
    { id: 'flat', name: 'Flat', surface: 'soft-flat', ...SOFT_SHAPE },
    { id: 'raised', name: 'Raised', surface: 'soft-raised', ...SOFT_SHAPE },
  ],
  defaultVariant: 2,
  link: { kind: 'groove', width: 8, caption: 'opaque' },
  view: { contents: 'opaque' },
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

/** Two broad colour washes over dots, fading at the edges; drawn dithered on the GPU, so they need no grain. */
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
  grain: 0,
};

/** Warm off-white paper with a fine fibre grain and faint dots. */
export const PAPER_BACKGROUND: Background = {
  id: 'paper',
  name: 'Paper',
  surface: 'paper',
  grid: 'dots',
  washes: [],
  fade: false,
  grain: 9 / 255,
  grainHue: 'warm',
};

/** A film's ground: near-black, with nothing drawn on it, for a scene that is animated and exported. */
export const FILM_BACKGROUND: Background = { ...PLAIN_BACKGROUND, id: 'film', name: 'Film', surface: 'film' };

/** The soft ground with no grid: the shapes' relief is the only texture. */
export const SOFT_BACKGROUND: Background = { ...PLAIN_BACKGROUND, id: 'soft', name: 'Soft', surface: 'soft' };

export const GLASS_NIGHT_THEME: Theme = {
  id: 'glass-night',
  name: 'Glass',
  styleSet: 'glass',
  background: 'glow',
  mode: 'dark',
};

export const PAPER_THEME: Theme = { id: 'paper', name: 'Paper', styleSet: 'glass', background: 'paper', mode: 'light' };

/** The theme a view naming none draws: flat shapes on dots, light or dark with the app. */
export const FLAT_THEME: Theme = { id: 'flat', name: 'Flat', styleSet: 'flat', background: 'dots' };

/** Glass shapes on the bare dark canvas, with no washes or grid. */
export const NIGHT_THEME: Theme = {
  id: 'night',
  name: 'Plastic',
  styleSet: 'glass',
  background: 'plain',
  mode: 'dark',
};

export const OUTLINE_THEME: Theme = { id: 'outline', name: 'Outline', styleSet: 'outline', background: 'lines' };

/** Flat shapes on the film ground, always dark: for titles and motion graphics. */
export const FILM_THEME: Theme = { id: 'film', name: 'Film', styleSet: 'flat', background: 'film', mode: 'dark' };

/** Soft shapes raised from a ground of the same tone, light or dark with the app. */
export const SOFT_THEME: Theme = { id: 'soft', name: 'Soft', styleSet: 'soft', background: 'soft' };

/** The Soft theme always light, whatever the app's mode. */
export const SOFT_LIGHT_THEME: Theme = {
  id: 'soft-light',
  name: 'Soft Light',
  styleSet: 'soft',
  background: 'soft',
  mode: 'light',
};

export const DEFAULT_STYLE_SETS: Readonly<Record<string, StyleSet>> = {
  flat: FLAT_STYLE_SET,
  outline: OUTLINE_STYLE_SET,
  glass: GLASS_STYLE_SET,
  soft: SOFT_STYLE_SET,
};

export const DEFAULT_BACKGROUNDS: Readonly<Record<string, Background>> = {
  plain: PLAIN_BACKGROUND,
  dots: DOTS_BACKGROUND,
  lines: LINES_BACKGROUND,
  glow: GLOW_BACKGROUND,
  paper: PAPER_BACKGROUND,
  film: FILM_BACKGROUND,
  soft: SOFT_BACKGROUND,
};

export const DEFAULT_THEMES: Readonly<Record<string, Theme>> = {
  'glass-night': GLASS_NIGHT_THEME,
  'night': NIGHT_THEME,
  'paper': PAPER_THEME,
  'flat': FLAT_THEME,
  'outline': OUTLINE_THEME,
  'film': FILM_THEME,
  'soft': SOFT_THEME,
  'soft-light': SOFT_LIGHT_THEME,
};

/** The ids of the built-ins, for pickers. */
export const THEME_IDS = ['glass-night', 'night', 'paper', 'flat', 'outline', 'film', 'soft', 'soft-light'] as const;
export const STYLE_SET_IDS = ['flat', 'outline', 'glass', 'soft'] as const;
export const BACKGROUND_IDS = ['plain', 'dots', 'lines', 'glow', 'paper', 'film', 'soft'] as const;

//
// Registry.
//

/** The themes a view offers, and the style sets and backgrounds they (and overrides) name. */
export type ThemeRegistry = {
  readonly themes: Readonly<Record<string, Theme>>;
  readonly styleSets: Readonly<Record<string, StyleSet>>;
  readonly backgrounds: Readonly<Record<string, Background>>;
};

/** A registry of the built-ins plus `extra`, whose entries win over a built-in of the same id. */
export const createThemeRegistry = (extra: Partial<ThemeRegistry> = {}): ThemeRegistry => ({
  themes: { ...DEFAULT_THEMES, ...extra.themes },
  styleSets: { ...DEFAULT_STYLE_SETS, ...extra.styleSets },
  backgrounds: { ...DEFAULT_BACKGROUNDS, ...extra.backgrounds },
});

export const defaultThemeRegistry: ThemeRegistry = createThemeRegistry();

/** Which tokens a look draws with: the light or dark variant, or (`theme`) whichever the app's theme is. */
export type LookTone = 'theme' | ThemeMode;

/** A theme resolved for drawing, with any overrides of its parts applied. */
export type SceneLook = {
  readonly theme: Theme;
  readonly styleSet: StyleSet;
  readonly background: Background;
  readonly tone: LookTone;
};

/** The look of a view that names nothing: the flat theme. */
export const DEFAULT_LOOK: SceneLook = {
  theme: FLAT_THEME,
  styleSet: FLAT_STYLE_SET,
  background: DOTS_BACKGROUND,
  tone: 'theme',
};

/** The canvas's pre-style-set look, for rows that must show a hue's four tones class for class; no theme offers it. */
export const CLASSIC_LOOK: SceneLook = {
  theme: { id: 'classic', name: 'Classic', styleSet: 'classic', background: 'plain' },
  styleSet: CLASSIC_STYLE_SET,
  background: PLAIN_BACKGROUND,
  tone: 'theme',
};

const lookup = <T>(record: Readonly<Record<string, T>>, id: string | undefined): T | undefined =>
  id !== undefined && Object.hasOwn(record, id) ? record[id] : undefined;

/** The theme `id` names, else flat: an unknown id (from a newer host, or a deleted theme) still draws. */
export const resolveTheme = (registry: ThemeRegistry, id: string | undefined): Theme =>
  lookup(registry.themes, id) ?? FLAT_THEME;

/** The style set `id` names, else flat. */
export const resolveStyleSet = (registry: ThemeRegistry, id: string | undefined): StyleSet =>
  lookup(registry.styleSets, id) ?? FLAT_STYLE_SET;

/** The background `id` names, else plain. */
export const resolveBackground = (registry: ThemeRegistry, id: string | undefined): Background =>
  lookup(registry.backgrounds, id) ?? PLAIN_BACKGROUND;

export type LookIds = {
  /** The theme; flat when unset or unknown. */
  theme?: string;
  /** Overrides the theme's style set, when it names one the registry knows. */
  styleSet?: string;
  /** Overrides the theme's background, when it names one the registry knows. */
  background?: string;
};

/** The look a view draws with: the theme, with an override of its style set or background where one resolves. */
export const resolveLook = (registry: ThemeRegistry, { theme: themeId, styleSet, background }: LookIds): SceneLook => {
  const theme = resolveTheme(registry, themeId);
  return {
    theme,
    styleSet: lookup(registry.styleSets, styleSet) ?? resolveStyleSet(registry, theme.styleSet),
    background: lookup(registry.backgrounds, background) ?? resolveBackground(registry, theme.background),
    tone: theme.mode ?? 'theme',
  };
};

/** The variant a node of `tone` draws as in `styleSet`: its tone's index, the last past the end, the default unset. */
export const styleVariant = (styleSet: StyleSet, tone: number | undefined): StyleVariant =>
  styleSet.variants[Math.min(tone ?? styleSet.defaultVariant, styleSet.variants.length - 1)] ??
  CLASSIC_STYLE_SET.variants[2];
