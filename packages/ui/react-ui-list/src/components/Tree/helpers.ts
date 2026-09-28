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

/** One level's indent in a compact tree; a regular tree steps by the row's block size instead. */
export const COMPACT_INDENT_STEP = `${DEFAULT_INDENTATION}px`;
export const BLOCK_INDENT_STEP = 'var(--dx-control)';

/** The row's depth as a length, applied as padding on the row's own grid so every track shifts with it. */
export const indentTrack = (level: number, step = COMPACT_INDENT_STEP): string => `calc(${level - 1} * ${step})`;
