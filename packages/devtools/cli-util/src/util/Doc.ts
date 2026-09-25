//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Ansi from './Ansi.ts';

/**
 * Minimal stand-in for `@effect/printer/Doc` (and `AnsiDoc`'s renderer).
 *
 * Vendored: `@effect/printer` peers `effect ^3` permanently, v4 ships no printer, and its sealed
 * CLI-internal renderer exposes no general seam — so depending on either would cost a second copy
 * of Effect for rendering alone.
 *
 * There is no reflow: nothing constructs a `group` or a soft line, so every break is mandatory and
 * rendering is a straight line-by-line walk. Revisit if a v4 printer ships.
 */

/** A rendered line: the styled text, plus the column width its escape sequences do not occupy. */
type Line = { text: string; width: number };

/**
 * A document. The type parameter carries the annotation type for source compatibility with
 * `@effect/printer`; it is unused here because annotations are applied as they are rendered.
 */
export type Doc<_A = never> = { readonly lines: () => Line[] };

const make = (lines: () => Line[]): Doc<any> => ({ lines });

const plain = (text: string): Line => ({ text, width: text.length });

/** Joins two runs of lines, merging at the boundary: only an explicit break starts a new line. */
const join = (left: Line[], right: Line[]): Line[] => {
  if (left.length === 0) {
    return right;
  }
  if (right.length === 0) {
    return left;
  }
  const last = left[left.length - 1];
  const first = right[0];
  return [...left.slice(0, -1), { text: last.text + first.text, width: last.width + first.width }, ...right.slice(1)];
};

/** A literal. Embedded newlines split the text, matching `Doc.string`. */
export const string = (value: string): Doc<never> => make(() => value.split('\n').map(plain));

export const text = string;

/** A mandatory line break. */
export const hardLine: Doc<never> = make(() => [plain(''), plain('')]);

/** A line break. Identical to {@link hardLine} here, since nothing flattens a document. */
export const line: Doc<never> = hardLine;

export const cat = <A>(self: Doc<A>, that: Doc<A>): Doc<A> => make(() => join(self.lines(), that.lines()));

export const hcat = <A>(docs: Iterable<Doc<A>>): Doc<A> =>
  make(() => [...docs].reduce<Line[]>((acc, next) => join(acc, next.lines()), []));

/** Concatenates with a line break between each document. */
export const vsep = <A>(docs: Iterable<Doc<A>>): Doc<A> => make(() => [...docs].flatMap((entry) => entry.lines()));

/** Pads the document out to `width` columns. Padding only; an overrun is left alone. */
export const fill =
  (width: number) =>
  <A>(self: Doc<A>): Doc<A> =>
    make(() => {
      const lines = self.lines();
      if (lines.length === 0) {
        return [{ text: ' '.repeat(width), width }];
      }
      const last = lines[lines.length - 1];
      const padding = Math.max(0, width - last.width);
      return [...lines.slice(0, -1), { text: last.text + ' '.repeat(padding), width: last.width + padding }];
    });

/** Indents every line by `columns`. */
export const indent = <A>(self: Doc<A>, columns: number): Doc<A> =>
  make(() => {
    const prefix = ' '.repeat(columns);
    return self.lines().map(({ text, width }) => ({ text: prefix + text, width: width + columns }));
  });

/** Applies an ANSI style to every non-empty line, leaving the measured width untouched. */
export const annotate = <A>(self: Doc<A>, style: Ansi.Ansi): Doc<A> =>
  make(() =>
    self.lines().map(({ text, width }) => ({ text: text === '' ? text : style.open + text + style.close, width })),
  );

/**
 * Renders a document to a string.
 *
 * The options bag is accepted for source compatibility with `AnsiDoc.render`; the layout it selects
 * is irrelevant without reflow.
 */
export const render = <A>(self: Doc<A>, _options?: { readonly style?: string }): string =>
  self
    .lines()
    .map(({ text }) => text)
    .join('\n');
