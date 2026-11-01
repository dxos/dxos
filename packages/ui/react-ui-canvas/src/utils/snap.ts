//
// Copyright 2026 DXOS.org
//

/** Screen px within which a moved shape is held on the line or cell it would snap to: a detent, not a jump. */
export const DETENT_PX = 8;

/** `value` held on `snapped` while within `detent` of it, otherwise left where it is. */
export const detentOf = (value: number, snapped: number, detent: number): number =>
  Math.abs(snapped - value) <= detent ? snapped : value;

/** `value` on the nearest whole `step`; a zero step leaves it. */
export const snapTo = (value: number, step: number): number => (step > 0 ? Math.round(value / step) * step : value);

/**
 * Where a dragged value shows while snapping is on: it follows the pointer, held on a whole `step` while within `detent`
 * of one; the release lands it with {@link snapTo}.
 */
export const magnetTo = (value: number, step: number, detent: number): number =>
  detentOf(value, snapTo(value, step), detent);
