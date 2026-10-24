//
// Copyright 2026 DXOS.org
//

import { type LayoutName } from './frontmatter.ts';
import { type SlotName } from './remark-slidev.ts';

/**
 * The slots of each layout with more than one, in reading order; content before the first marker goes to `default`.
 * `two-cols`, `three-cols` and `grid` also take `::left::` into their first region, as Slidev's `two-cols` does.
 */
export const LAYOUT_SLOTS: Partial<Record<LayoutName, readonly SlotName[]>> = {
  'two-cols': ['default', 'right'],
  'two-cols-header': ['default', 'left', 'right'],
  'three-cols': ['default', 'middle', 'right'],
  'grid': ['default', 'right', 'bottom-left', 'bottom-right'],
};

/** True when the layout has more than one slot, so a slot marker means something. */
export const hasSlots = (layout: LayoutName): boolean => (LAYOUT_SLOTS[layout]?.length ?? 0) > 1;

/** The slot after `slot` in the layout's reading order (a `::left::` region counts as the first); none after the last. */
export const nextSlot = (layout: LayoutName, slot: SlotName | undefined): SlotName | undefined => {
  const order = LAYOUT_SLOTS[layout];
  if (!order) {
    return undefined;
  }
  const current = slot === 'left' && !order.includes('left') ? 'default' : (slot ?? 'default');
  const index = order.indexOf(current);
  return index < 0 ? undefined : order[index + 1];
};
