//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** Built-in slide themes; `default` follows the app's light/dark mode. */
export const NAMES = ['default', 'light', 'dark', 'serif'] as const;

export type Name = (typeof NAMES)[number];

/** True for a built-in theme name. */
export const isName = (value: unknown): value is Name => NAMES.some((name) => name === value);

/** Fonts for a deck's text (body and headings). */
export const FONTS = [
  'mono',
  'sans',
  'rounded',
  'serif',
  'display',
  'space-grotesk',
  'mali',
  'geist',
  'orbitron',
  'unbounded',
  'opendyslexic',
  'lxgw-wenkai',
] as const;

export type Font = (typeof FONTS)[number];

/** Fonts for a deck's code. */
export const MONO_FONTS = ['jetbrains', 'fira', 'plex', 'system'] as const;

export type MonoFont = (typeof MONO_FONTS)[number];

/** The text font a built-in theme uses when the deck sets none (the serif theme's is the system serif). */
export const defaultFont = (name: Name | undefined): Font => (name === 'serif' ? 'serif' : 'mono');

/** The code font every built-in theme uses when the deck sets none. */
export const DEFAULT_MONO_FONT: MonoFont = 'jetbrains';

/** True for a text font name. */
export const isFont = (value: unknown): value is Font => FONTS.some((font) => font === value);

/** True for a code font name. */
export const isMonoFont = (value: unknown): value is MonoFont => MONO_FONTS.some((font) => font === value);

// The CSS named colors, so a bare word is checked against the ones that are colors; a word CSS does not know would
// leave the variable invalid, and the element would inherit a color rather than fall back to the theme's.
const NAMED_COLORS = [
  'aliceblue',
  'antiquewhite',
  'aqua',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'black',
  'blanchedalmond',
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'cyan',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgreen',
  'darkgrey',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'fuchsia',
  'gainsboro',
  'ghostwhite',
  'gold',
  'goldenrod',
  'gray',
  'green',
  'greenyellow',
  'grey',
  'honeydew',
  'hotpink',
  'indianred',
  'indigo',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgreen',
  'lightgrey',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'lime',
  'limegreen',
  'linen',
  'magenta',
  'maroon',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'navy',
  'oldlace',
  'olive',
  'olivedrab',
  'orange',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'pink',
  'plum',
  'powderblue',
  'purple',
  'rebeccapurple',
  'red',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'silver',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'teal',
  'thistle',
  'tomato',
  'turquoise',
  'violet',
  'wheat',
  'white',
  'whitesmoke',
  'yellow',
  'yellowgreen',
  'transparent',
  'currentcolor',
] as const;

// A number as a color function writes one: optionally signed. The decimal point is the only way to split a digit
// run, so the alternatives cannot both match one — overlapping ones make a failing value retry every split, and
// `parseSlide` runs on the editor's thread at every keystroke.
const PLAIN = '[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)';
const PERCENT = `${PLAIN}%`;
const NUMBER = `${PLAIN}%?`;

// The modern syntax every color function takes: three components separated by spaces, each a number or a
// percentage, with an optional alpha.
const modern = (functions: string) =>
  `(?:${functions})\\(\\s*${NUMBER}\\s+${NUMBER}\\s+${NUMBER}(?:\\s*/\\s*${NUMBER})?\\s*\\)`;

// The legacy comma syntax, which only the sRGB and HSL functions take, and never mixed with spaces. Its component
// types are fixed: all three numbers or all three percentages for `rgb()`, and a hue with two percentages for
// `hsl()`. The alpha is a number or a percentage either way.
const commas = (first: string, second: string, third: string) =>
  `\\(\\s*${first}\\s*,\\s*${second}\\s*,\\s*${third}(?:\\s*,\\s*${NUMBER})?\\s*\\)`;

const COLOR_FUNCTION = [
  modern('rgb|rgba|hsl|hsla|oklch|oklab|lab|lch'),
  `(?:rgb|rgba)(?:${commas(PLAIN, PLAIN, PLAIN)}|${commas(PERCENT, PERCENT, PERCENT)})`,
  `(?:hsl|hsla)${commas(PLAIN, PERCENT, PERCENT)}`,
].join('|');

/**
 * Values reach inline styles, so only plain colors pass: a hex color, one of the named colors, or a color function
 * written as CSS writes it. `url(...)`, other functions, and a function whose components are missing, malformed or
 * separated in two ways at once are rejected — a value CSS cannot parse would leave the variable invalid, and the
 * element would inherit a color rather than fall back to the theme's.
 */
export const COLOR_PATTERN = new RegExp(
  [
    '^(?:',
    '#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})',
    `|${COLOR_FUNCTION}`,
    `|(?:${NAMED_COLORS.join('|')})`,
    ')$',
  ].join(''),
  'i',
);

/** True for a hex color (3, 4, 6 or 8 digits), a CSS named color, or an `rgb`/`hsl`/`oklch`-style color function. */
export const isColor = (value: unknown): value is string => typeof value === 'string' && COLOR_PATTERN.test(value);

const Color = Schema.String.pipe(Schema.check(Schema.isPattern(COLOR_PATTERN)));

/**
 * Tones a slide element may take, which repaint the accent parts of a variant (`<List tone="warning">`); the first
 * is the theme's own accent.
 */
export const TONES = ['accent', 'info', 'success', 'warning', 'error', 'neutral'] as const;

export type Tone = (typeof TONES)[number];

/** True for a tone name. */
export const isTone = (value: unknown): value is Tone => TONES.some((tone) => tone === value);

/**
 * A deck's theme: a built-in base theme plus optional overrides of its colors and its text and code fonts.
 */
export const Settings = Schema.Struct({
  base: Schema.optional(Schema.Literals(NAMES)).annotate({ title: 'Base' }),
  accent: Schema.optional(Color).annotate({ title: 'Accent color' }),
  background: Schema.optional(Color).annotate({ title: 'Background color' }),
  foreground: Schema.optional(Color).annotate({ title: 'Text color' }),
  /** The fill behind code and the filled list and table variants. */
  code: Schema.optional(Color).annotate({ title: 'Code background' }),
  /** Table rules and other hairlines. */
  separator: Schema.optional(Color).annotate({ title: 'Separator color' }),
  font: Schema.optional(Schema.Literals(FONTS)).annotate({ title: 'Font' }),
  monoFont: Schema.optional(Schema.Literals(MONO_FONTS)).annotate({ title: 'Code font' }),
});

export type Settings = Schema.Schema.Type<typeof Settings>;
