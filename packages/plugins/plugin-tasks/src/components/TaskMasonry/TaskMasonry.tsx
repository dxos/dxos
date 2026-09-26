//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType } from 'react';

import { Masonry } from '@dxos/react-ui-masonry';
import { cardMaxInlineSize, cardMinInlineSize } from '@dxos/ui-theme';

/** Cards in the task pane are three quarters of a standard card, so a grid reads as part of the task. */
export const TASK_CARD_SCALE = 0.75;

export type TaskMasonryProps<Item> = {
  items: readonly Item[];
  /** A stable id per item; also keys the remembered tile heights. */
  getId: (item: Item) => string;
  /** The masonry's tile signature: a tile may ignore `index` and `selected`. */
  Tile: ComponentType<{ data: Item; index: number; selected?: boolean }>;
  /** Scope for remembering tile heights across mounts, e.g. the task's URI plus the section. */
  cacheKey?: string;
};

/**
 * The card grid the task pane uses for its attachments and artifacts: a masonry of cards scaled to
 * {@link TASK_CARD_SCALE}, aligned to the start of the column. Tiles should render `Card.Root` with
 * `fullWidth`, since the columns are narrower than a standard card's minimum width.
 */
export const TaskMasonry = <Item,>({ items, getId, Tile, cacheKey }: TaskMasonryProps<Item>) => (
  <Masonry.Root
    Tile={Tile}
    centered={false}
    minColumnWidth={cardMinInlineSize * TASK_CARD_SCALE}
    maxColumnWidth={cardMaxInlineSize * TASK_CARD_SCALE}
  >
    <Masonry.Viewport
      items={items}
      getId={getId}
      cacheKey={cacheKey}
      // The pane already scrolls, so the grid is a plain block rather than a nested, padded scroller.
      scroll={false}
      // The masonry pads its top and bottom by the gap, which the section's own spacing already gives.
      classNames='-my-3'
    />
  </Masonry.Root>
);
