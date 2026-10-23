//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** Built-in slide themes; `default` follows the app's light/dark mode. */
export const NAMES = ['default', 'light', 'dark', 'serif'] as const;

export type Name = (typeof NAMES)[number];

/** True for a built-in theme name. */
export const isName = (value: unknown): value is Name => NAMES.some((name) => name === value);

// Values reach inline styles, so only plain colors and font lists pass; `url(...)` and other functions are rejected.
const COLOR_PATTERN =
  /^(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|[a-z]+|(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\([\d\s.,%/+-]*\))$/i;
const FONT_PATTERN = /^[\w\s,'"-]+$/;

/** True for a hex color (3, 4, 6 or 8 digits), a color name, or an `rgb`/`hsl`/`oklch`-style function of numbers. */
export const isColor = (value: unknown): value is string => typeof value === 'string' && COLOR_PATTERN.test(value);

/** True for a font-family list: names, quotes, commas, spaces and hyphens only. */
export const isFont = (value: unknown): value is string => typeof value === 'string' && FONT_PATTERN.test(value);

const Color = Schema.String.pipe(Schema.check(Schema.isPattern(COLOR_PATTERN)));

const Font = Schema.String.pipe(Schema.check(Schema.isPattern(FONT_PATTERN)));

/**
 * A deck's theme: a built-in name plus optional overrides of its colors and font.
 */
export const Settings = Schema.Struct({
  name: Schema.optional(Schema.Literals(NAMES)).annotate({ title: 'Theme' }),
  accent: Schema.optional(Color).annotate({ title: 'Accent color' }),
  background: Schema.optional(Color).annotate({ title: 'Background color' }),
  foreground: Schema.optional(Color).annotate({ title: 'Text color' }),
  font: Schema.optional(Font).annotate({ title: 'Font' }),
});

export type Settings = Schema.Schema.Type<typeof Settings>;
