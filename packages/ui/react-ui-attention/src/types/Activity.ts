//
// Copyright 2026 DXOS.org
//

import { type Label } from '@dxos/ui-types';

/**
 * The places on the attention glyph an activity can draw: the square's fill, the mark inside it, its edge, and a dot
 * at its corner. Each holds at most one treatment.
 */
export type Slot = 'fill' | 'mark' | 'edge' | 'corner';

/** The slots in drawing order, back to front. */
export const Slots: readonly Slot[] = ['fill', 'mark', 'edge', 'corner'];

/** Every slot's treatments, highest precedence first: when several are requested for one slot, the first wins. */
export const Treatments = {
  fill: ['attended', 'contains-attended', 'busy'],
  mark: ['agent', 'agent-done', 'typing', 'viewers-working', 'viewers', 'viewer'],
  edge: ['failed', 'following', 'call', 'working', 'scheduled'],
  corner: ['asked', 'mention', 'changed', 'read-only'],
} as const satisfies Record<Slot, readonly string[]>;

export type FillTreatment = (typeof Treatments.fill)[number];
export type MarkTreatment = (typeof Treatments.mark)[number];
export type EdgeTreatment = (typeof Treatments.edge)[number];
export type CornerTreatment = (typeof Treatments.corner)[number];
export type Treatment = FillTreatment | MarkTreatment | EdgeTreatment | CornerTreatment;

/** Something happening on an object, as one line of the glyph's tooltip and, optionally, one treatment on it. */
export type Entry = {
  /** Who reported it, e.g. `presence` or `assistant`. */
  readonly source: string;
  /** Shown in the tooltip whether or not the treatment wins its slot. */
  readonly label: Label;
  readonly treatment?: Treatment;
};

/** Treatments that animate; at most one of them moves at a time. */
const ANIMATED: ReadonlySet<Treatment> = new Set<Treatment>(['busy', 'typing', 'viewers-working', 'agent', 'asked']);

/** Which slot keeps its motion when several animate: what asks for you first, then who is there. The edge never moves. */
const MOTION_ORDER: readonly Slot[] = ['corner', 'mark', 'fill'];

/** What the glyph draws: the winning treatment per slot, and the one slot whose treatment animates. */
export type Resolved = {
  readonly fill?: FillTreatment;
  readonly mark?: MarkTreatment;
  readonly edge?: EdgeTreatment;
  readonly corner?: CornerTreatment;
  readonly moving?: Slot;
};

/** Whether the treatment animates when it is the one allowed to move. */
export const isAnimated = (treatment: Treatment): boolean => ANIMATED.has(treatment);

const first = <T extends Treatment>(treatments: readonly T[], requested: ReadonlySet<Treatment>): T | undefined =>
  treatments.find((treatment) => requested.has(treatment));

/**
 * Reduces any set of requested treatments to one per slot by precedence, then lets only the first animated slot in
 * {@link MOTION_ORDER} move, so every combination draws at most four things and animates at most one.
 */
export const resolve = (treatments: Iterable<Treatment>): Resolved => {
  const requested = new Set(treatments);
  const resolved = {
    fill: first(Treatments.fill, requested),
    mark: first(Treatments.mark, requested),
    edge: first(Treatments.edge, requested),
    corner: first(Treatments.corner, requested),
  };
  const moving = MOTION_ORDER.find((slot) => {
    const treatment = resolved[slot];
    return treatment !== undefined && ANIMATED.has(treatment);
  });

  return { ...resolved, moving };
};
