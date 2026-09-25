//
// Copyright 2026 DXOS.org
//

/** Phosphor's weights; the only variants an icon name may carry. */
export const WEIGHTS = ['bold', 'duotone', 'fill', 'light', 'regular', 'thin'] as const;

// A symbol reference is always delimited by a quote, brace, `#`, or whitespace, never by another
// identifier character. Required because `@ch-ui/icons` scans unanchored: without these, a set name
// that is a suffix of a preceding token matches (`4px--x--regular` in any scanned CSS, or the `x` in
// `dx--x--bold` once the single-weight lookahead below has declined position 0), and so does a
// longer word that merely starts with a weight (`--regularized` matching `--regular`). Each yields a
// symbol name nothing put there, whose asset is then missing.
const BOUNDARY_BEFORE = '(?<![a-zA-Z0-9_-])';
const BOUNDARY_AFTER = '(?![a-zA-Z0-9_-])';

// Icon names are lowercase kebab-case; digits are deliberately excluded, matching the icon sets.
const NAME = '[a-z]+[a-z-]*';

export type SymbolPatternParams = {
  /** Icon-set prefixes in match order, e.g. `['ph', 'dx', 'px']`. */
  sets: string[];
  /**
   * Sets drawn at a single weight, so only `regular` is a valid variant for them. Without this a
   * name like `dx--dxos--bold` resolves to a file that does not exist.
   */
  regularOnly?: string[];
  weights?: readonly string[];
};

/**
 * Builds the `symbolPattern` for `IconsPlugin`.
 *
 * Defined here rather than written out per host: every host needs the identical pattern, and the
 * boundary and single-weight rules are subtle enough that three hand-maintained copies drifted.
 */
export const iconSymbolPattern = ({ sets, regularOnly = [], weights = WEIGHTS }: SymbolPatternParams): string => {
  const others = weights.filter((weight) => weight !== 'regular');
  const singleWeight =
    regularOnly.length > 0 && others.length > 0
      ? `(?!(?:${regularOnly.join('|')})--${NAME}--(?:${others.join('|')}))`
      : '';

  return BOUNDARY_BEFORE + singleWeight + `(${sets.join('|')})--(${NAME})--(${weights.join('|')})` + BOUNDARY_AFTER;
};
