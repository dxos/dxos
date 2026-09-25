//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/**
 * Minimal stand-in for `@effect/printer-ansi/Ansi`.
 *
 * Vendored alongside {@link ./doc.ts}, which carries the full rationale; in short, the package is
 * staying on the Effect 3 line and v4 has no counterpart. Only the styles the CLI uses are kept.
 *
 * `chalk` would cover this file (it is already a catalog dependency of `@dxos/log`), but not
 * `doc.ts`'s layout — so a swap would leave the vendoring in place and add a dependency.
 */

/** An ANSI style: the escape written before the text and the one that restores the default. */
export type Ansi = {
  readonly open: string;
  readonly close: string;
};

const style = (open: number, close: number): Ansi => ({ open: `[${open}m`, close: `[${close}m` });

export const bold: Ansi = style(1, 22);
export const green: Ansi = style(32, 39);
export const yellow: Ansi = style(33, 39);
export const cyan: Ansi = style(36, 39);
export const white: Ansi = style(37, 39);
export const blackBright: Ansi = style(90, 39);

/** Applies `self` outside `that`, so closing the inner style restores the outer one. */
export const combine = (self: Ansi, that: Ansi): Ansi => ({
  open: self.open + that.open,
  close: that.close + self.close,
});
