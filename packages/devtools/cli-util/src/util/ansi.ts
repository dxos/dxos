//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/**
 * Minimal stand-in for `@effect/printer-ansi/Ansi`.
 *
 * That package has no Effect 4 release — its peer range is `effect: ^3.21.0` — so keeping it would
 * mean keeping a second copy of Effect in the CLI bundle. Only the styles the CLI uses are kept.
 */

/** An ANSI style: the escape written before the text and the one that restores the default. */
export type Ansi = {
  readonly open: string;
  readonly close: string;
};

const style = (open: number, close: number): Ansi => ({ open: `[${open}m`, close: `[${close}m` });

export const bold: Ansi = style(1, 22);
export const black: Ansi = style(30, 39);
export const red: Ansi = style(31, 39);
export const green: Ansi = style(32, 39);
export const yellow: Ansi = style(33, 39);
export const blue: Ansi = style(34, 39);
export const magenta: Ansi = style(35, 39);
export const cyan: Ansi = style(36, 39);
export const white: Ansi = style(37, 39);
export const blackBright: Ansi = style(90, 39);

/** Applies `self` outside `that`, so closing the inner style restores the outer one. */
export const combine = (self: Ansi, that: Ansi): Ansi => ({
  open: self.open + that.open,
  close: that.close + self.close,
});
