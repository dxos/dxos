//
// Copyright 2026 DXOS.org
//

import { type Hue, type Label } from '@dxos/ui-types';

/**
 * The places on the attention glyph an activity can draw: the square's fill, the mark inside it, its edge, and a dot
 * at its corner. Each holds at most one treatment.
 */
export type Slot = 'fill' | 'mark' | 'edge' | 'corner';

/** The slots in drawing order, back to front. */
export const Slots: readonly Slot[] = ['fill', 'mark', 'edge', 'corner'];

/** A mark the glyph draws itself; any other mark is a Phosphor icon id (e.g. `ph--warning--fill`). */
export type MarkShape = 'dot' | 'dots' | 'star';

/** What every treatment carries, whatever its slot. */
type Common = {
  /** Within a slot the highest priority wins, and a tie goes to the first requested. Presence draws at 10. */
  readonly priority: number;
  /** Asks for the slot's motion; at most one slot moves (see {@link resolve}). The edge never moves. */
  readonly animate?: boolean;
};

/** A wash of colour behind the mark. Attention always takes the fill first. */
export type Fill = Common & {
  readonly slot: 'fill';
  readonly hue: Hue;
  /** How much of the hue shows, from 0 to 1; 0.25 when unset. */
  readonly opacity?: number;
};

export type Mark = Common & {
  readonly slot: 'mark';
  readonly icon: MarkShape | (string & {});
  /** The text colour when unset. */
  readonly hue?: Hue;
};

/** An outline around the square, dashed for something due rather than under way. */
export type Edge = Omit<Common, 'animate'> & {
  readonly slot: 'edge';
  readonly hue: Hue;
  readonly dashed?: boolean;
};

/** A dot, or a ring, just outside the square's top-right corner. */
export type Corner = Common & {
  readonly slot: 'corner';
  readonly hue: Hue;
  readonly shape?: 'dot' | 'ring';
};

/** How one activity draws: which slot it claims, what it draws there and how strongly it claims it. */
export type Treatment = Fill | Mark | Edge | Corner;

/** Something happening on an object, as one line of the glyph's tooltip and, optionally, one treatment on it. */
export type Entry = {
  /** Who reported it, e.g. `presence` or `assistant`. */
  readonly source: string;
  /** Shown in the tooltip whether or not the treatment wins its slot. */
  readonly label: Label;
  readonly treatment?: Treatment;
};

/** Which slot keeps its motion when several animate: what asks for you first, then who is there. The edge never moves. */
const MOTION_ORDER: readonly ('corner' | 'mark' | 'fill')[] = ['corner', 'mark', 'fill'];

/** What the glyph draws: the winning treatment per slot, and the one slot whose treatment animates. */
export type Resolved = {
  readonly fill?: Fill;
  readonly mark?: Mark;
  readonly edge?: Edge;
  readonly corner?: Corner;
  readonly moving?: Slot;
};

export type ResolveOptions = {
  /** The item is attended, or contains the attended item: attention holds the fill, still, over any treatment. */
  readonly attention?: boolean;
};

type InSlot<S extends Slot> = Extract<Treatment, { slot: S }>;

const winner = <S extends Slot>(treatments: readonly Treatment[], slot: S): InSlot<S> | undefined =>
  treatments
    .filter((treatment): treatment is InSlot<S> => treatment.slot === slot)
    .reduce<InSlot<S> | undefined>(
      (best, treatment) => (!best || treatment.priority > best.priority ? treatment : best),
      undefined,
    );

/**
 * Reduces any set of requested treatments to one per slot by priority, then lets only the first animated slot in
 * {@link MOTION_ORDER} move, so every combination draws at most four things and animates at most one.
 */
export const resolve = (treatments: Iterable<Treatment>, { attention }: ResolveOptions = {}): Resolved => {
  const requested = [...treatments];
  const resolved = {
    fill: attention ? undefined : winner(requested, 'fill'),
    mark: winner(requested, 'mark'),
    edge: winner(requested, 'edge'),
    corner: winner(requested, 'corner'),
  };
  const moving = MOTION_ORDER.find((slot) => resolved[slot]?.animate);

  return { ...resolved, moving };
};
