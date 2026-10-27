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

// Values reach inline styles, so only plain colors pass; `url(...)` and other functions are rejected.
const COLOR_PATTERN =
  /^(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|[a-z]+|(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\([\d\s.,%/+-]*\))$/i;

/** True for a hex color (3, 4, 6 or 8 digits), a color name, or an `rgb`/`hsl`/`oklch`-style function of numbers. */
export const isColor = (value: unknown): value is string => typeof value === 'string' && COLOR_PATTERN.test(value);

const Color = Schema.String.pipe(Schema.check(Schema.isPattern(COLOR_PATTERN)));

/**
 * A deck's theme: a built-in base theme plus optional overrides of its colors and its text and code fonts.
 */
export const Settings = Schema.Struct({
  base: Schema.optional(Schema.Literals(NAMES)).annotate({ title: 'Base' }),
  accent: Schema.optional(Color).annotate({ title: 'Accent color' }),
  background: Schema.optional(Color).annotate({ title: 'Background color' }),
  foreground: Schema.optional(Color).annotate({ title: 'Text color' }),
  font: Schema.optional(Schema.Literals(FONTS)).annotate({ title: 'Font' }),
  monoFont: Schema.optional(Schema.Literals(MONO_FONTS)).annotate({ title: 'Code font' }),
});

export type Settings = Schema.Schema.Type<typeof Settings>;
