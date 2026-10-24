//
// Copyright 2026 DXOS.org
//

import { type LayoutName } from './frontmatter.ts';
import { type SlotName, SLOTS } from './remark-slidev.ts';
import { slideTokens } from './tokens.ts';

/**
 * The slots of each layout with more than one, in reading order; content before the first marker goes to `default`.
 * `two-cols`, `three-cols` and `two-by-two` also take `::left::` into their first region, as Slidev's `two-cols` does.
 */
export const LAYOUT_SLOTS: Partial<Record<LayoutName, readonly SlotName[]>> = {
  'two-cols': ['default', 'right'],
  'two-cols-header': ['default', 'left', 'right'],
  'three-cols': ['default', 'middle', 'right'],
  'two-by-two': ['default', 'right', 'bottom-left', 'bottom-right'],
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

/**
 * The region the caret at `offset` is in: the last slot marker before it (fenced code excluded), or the first region
 * when none precedes it. Read from the markers rather than from rendered content, so a blank line or the marker line
 * itself still counts as being in that region.
 */
export const slotBefore = (content: string, offset: number): SlotName | undefined => {
  const marker = slideTokens(content)
    .filter((token) => token.kind === 'slot' && token.from < offset)
    .at(-1);
  const name = marker && /::([a-z-]+)::/.exec(content.slice(marker.from, marker.to))?.[1];
  return SLOTS.find((slot) => slot === name);
};
