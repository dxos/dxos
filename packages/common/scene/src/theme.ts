//
// Copyright 2026 DXOS.org
//

// The slots a theme fills: the colours a drawing names and the faces its text is set in. A style names a slot and
// the theme decides what draws, so one drawing reads right in every theme and a theme changes it without an edit.

import * as Schema from 'effect/Schema';

import { Color, type ColorValue, DEFAULT_COLOR, formatColor, parseColor } from './color.ts';

/** A typeface slot of the theme (`body`, `mono`, or any other the theme defines). */
export const Font = Schema.String.annotate({ title: 'Font' });
export type Font = Schema.Schema.Type<typeof Font>;

/** The face a text with no font is set in. */
export const DEFAULT_FONT = 'body';

/** The slots every theme fills, so a drawing may name them whatever theme draws it. */
export const FONT_SLOTS = ['body', 'mono'] as const;

/** The slots a theme fills, by name. */
export const ThemeSlots = Schema.Struct({
  /** Named colours, each one of the theme's hues at a tone, another name, or a literal. */
  colors: Schema.optional(Schema.Record(Schema.String, Color)),
  /** Typefaces, each a CSS `font-family` value. */
  fonts: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});
export type ThemeSlots = Schema.Schema.Type<typeof ThemeSlots>;

/**
 * The slots a theme that defines none draws with. The colours are the names diagrams have always used that are not
 * hues of the app's palette, so a drawing that names one keeps its look.
 */
export const DEFAULT_THEME_SLOTS: Required<ThemeSlots> = {
  colors: {
    'grey': 'neutral',
    'light-violet': 'violet',
    'light-blue': 'sky',
    'light-green': 'lime',
    'light-red': 'rose',
  },
  fonts: {
    body: 'var(--font-body, ui-sans-serif, system-ui, sans-serif)',
    mono: 'var(--font-mono, ui-monospace, monospace)',
  },
};

/** How many names a colour may pass through before it must reach a hue or a literal, so a cycle ends. */
const MAX_INDIRECTION = 4;

/**
 * The hue or literal a colour draws as in `theme`: a name the theme defines resolves to what it names, and takes the
 * tone the drawing states over the theme's, a literal included. A name the theme does not define is one of its hues.
 */
export const resolveColor = (
  color: string | undefined,
  theme: ThemeSlots = DEFAULT_THEME_SLOTS,
): ColorValue | undefined => {
  let value = parseColor(color);
  for (let step = 0; step < MAX_INDIRECTION && value?.kind === 'name'; step++) {
    const named = theme.colors?.[value.name] ?? DEFAULT_THEME_SLOTS.colors[value.name];
    const next = parseColor(named);
    if (!next) {
      break;
    }
    value = value.tone !== undefined ? { ...next, tone: value.tone } : next;
  }
  return value;
};

/**
 * The hue a colour draws as in `theme` and the tone it states; no hue for the look's own colour (`default`), and
 * nothing at all for a literal.
 */
export const resolveHue = (
  color: string | undefined,
  theme?: ThemeSlots,
): { hue?: string; tone?: number } | undefined => {
  const value = resolveColor(color, theme);
  return value?.kind === 'name'
    ? {
        ...(value.name !== DEFAULT_COLOR ? { hue: value.name } : {}),
        ...(value.tone !== undefined ? { tone: value.tone } : {}),
      }
    : undefined;
};

/** A colour with every name the theme defines resolved: a hue at a tone, or a literal. */
export const resolvedColor = (color: string | undefined, theme?: ThemeSlots): Color | undefined => {
  const value = resolveColor(color, theme);
  return value === undefined ? undefined : value.kind === 'name' ? formatColor(value.name, value.tone) : value.css;
};

/** The CSS `font-family` a font slot draws with in `theme`; a slot it does not define draws as the body face. */
export const resolveFont = (font: string | undefined, theme: ThemeSlots = DEFAULT_THEME_SLOTS): string => {
  const slot = font ?? DEFAULT_FONT;
  return (
    theme.fonts?.[slot] ??
    DEFAULT_THEME_SLOTS.fonts[slot] ??
    theme.fonts?.[DEFAULT_FONT] ??
    DEFAULT_THEME_SLOTS.fonts[DEFAULT_FONT]
  );
};
