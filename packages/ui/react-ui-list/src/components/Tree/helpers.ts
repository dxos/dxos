//
// Copyright 2024 DXOS.org
//

export const DEFAULT_INDENTATION = 8;

/**
 * Indent the drop hitbox reasons in, which is deliberately wider than the visual one.
 *
 * The `reparent` zones under a last child are carved out of the row's bottom band by indent, so at
 * the visual 8px they are 8px-wide strips — the instruction is produced (measurable) but no one can
 * hit it, which reads as "there is no way to drop past the last child". The indicator keeps using
 * the visual indent so its line still lands under the row it refers to.
 */
export const DROP_INDENTATION = 24;

/** The row's indent track — a grid track rather than padding, so the row's other tracks shift with it. */
export const indentTrack = (level: number, indentation = DEFAULT_INDENTATION): string =>
  `${(level - 1) * indentation}px`;
