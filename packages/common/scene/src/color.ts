//
// Copyright 2026 DXOS.org
//

// One spelling for every colour a drawing stores: a name the theme resolves, optionally at a tone, or a literal CSS
// colour. A style states what a colour is for, and the theme says what it looks like.

import * as Schema from 'effect/Schema';

/** A theme name with an optional tone, 0 to 3 (`blue`, `blue/2`, `accent`). */
const NAMED = /^([a-z][a-z0-9-]*)(?:\/([0-3]))?$/;

/** What a CSS functional notation may hold: numbers, units, names and separators, and nothing that ends a declaration. */
const ARGUMENTS = '[0-9a-zA-Z.,%/ +-]+';

/** A CSS hex colour: three, four, six or eight digits. */
const HEX = '#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})';

/** A literal CSS colour: hex (`#1e90ff`) or a functional notation (`rgb(…)`, `oklch(…)`). */
const LITERAL = new RegExp(`^(?:${HEX}|[a-z][a-z0-9-]*\\(${ARGUMENTS}\\))$`);

/** Either spelling, as one pattern a JSON Schema can carry. */
const COLOR = new RegExp(`^(?:[a-z][a-z0-9-]*(?:/[0-3])?|${HEX}|[a-z][a-z0-9-]*\\(${ARGUMENTS}\\))$`);

/**
 * A colour as a drawing stores one:
 * - `blue`: a name the theme resolves, first among its named colours (`accent`), then among its hues;
 * - `blue/2`: that name at a tone, 0 (an outline) to 3 (the lightest fill; a text has no 0); `default/2` is the
 *   look's own colour at that tone;
 * - `#1e90ff` or `rgb(30 144 255)`: a literal CSS colour, drawn as written in every theme.
 */
export const Color = Schema.String.check(Schema.isPattern(COLOR)).annotate({ title: 'Color' });
export type Color = Schema.Schema.Type<typeof Color>;

/**
 * The name of the look's own colour, which an element that states no colour draws in. It exists so a tone can be
 * stated without a hue: `default/0` is an outline in the look's own colour.
 */
export const DEFAULT_COLOR = 'default';

/** A colour read apart: a theme name at a tone, or a CSS literal. */
export type ColorValue =
  | { readonly kind: 'name'; readonly name: string; readonly tone?: number }
  // A literal has a tone only where a theme name that stated one resolved to it (`brand/1`).
  | { readonly kind: 'css'; readonly css: string; readonly tone?: number };

/** A colour read apart; a string that is neither spelling is undefined, so a caller draws its default. */
export const parseColor = (color: string | undefined): ColorValue | undefined => {
  if (color === undefined) {
    return undefined;
  }
  const named = NAMED.exec(color);
  if (named) {
    return { kind: 'name', name: named[1], ...(named[2] !== undefined ? { tone: Number(named[2]) } : {}) };
  }
  return LITERAL.test(color) ? { kind: 'css', css: color } : undefined;
};

/** A theme name at a tone as a colour; no tone leaves the name alone, so the look's own default draws. */
export const formatColor = (name: string, tone?: number): Color => (tone === undefined ? name : `${name}/${tone}`);

/** The theme name a colour states; none for a literal. */
export const colorName = (color: string | undefined): string | undefined => {
  const value = parseColor(color);
  return value?.kind === 'name' ? value.name : undefined;
};

/** The tone a colour states; none for a literal, or a name alone. */
export const colorTone = (color: string | undefined): number | undefined => {
  const value = parseColor(color);
  return value?.kind === 'name' ? value.tone : undefined;
};

/** The colour at another tone, or with none; a literal has no tones and is returned as it is. */
export const withTone = (color: string, tone: number | undefined): Color => {
  const value = parseColor(color);
  return value?.kind === 'name' ? formatColor(value.name, tone) : color;
};

/** The literal a colour states; none for a theme name. */
export const colorLiteral = (color: string | undefined): string | undefined => {
  const value = parseColor(color);
  return value?.kind === 'css' ? value.css : undefined;
};
