//
// Copyright 2026 DXOS.org
//

/** Position of an action instance on the device, as reported by Stream Deck. */
export type Positioned = {
  readonly coordinates?: { readonly column: number; readonly row: number };
};

/**
 * Orders the placed instances of one action into slots, reading order first.
 *
 * The user decides how many of our actions to place and where, so slots are positional rather than
 * configured: the top-left Favorite key is slot 0. Instances without coordinates (part of a
 * multi-action) have no position on the device and are dropped.
 *
 * Pure, so the ordering is testable without a device.
 */
export const assignSlots = <T extends Positioned>(instances: Iterable<T>): T[] =>
  [...instances]
    .filter((instance) => instance.coordinates !== undefined)
    .sort((a, b) => a.coordinates!.row - b.coordinates!.row || a.coordinates!.column - b.coordinates!.column);

/** Slot of one instance among its siblings, or `-1` when it is not placed on the device. */
export const slotOf = <T extends Positioned>(instances: Iterable<T>, instance: T): number =>
  assignSlots(instances).indexOf(instance);
