//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Masonry } from '@dxos/react-ui-masonry';

import { EntryCard } from './EntryCard.tsx';
import { type Entry } from './ListView.tsx';

/** The same cards in balanced columns, which is where rows of unequal height belong. */
export const MasonryView = ({
  entries,
  selected,
  onSelect,
  onRemove,
}: {
  entries: readonly Entry[];
  selected?: string;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
}) => {
  const Tile = useCallback(({ data }: { data: Entry }) => <EntryCard entry={data} onRemove={onRemove} />, [onRemove]);

  // The tile carries selection, not the card: `Focus.Item` then draws the same selected edge the list
  // does. Activation — a click, or Enter on the tile the arrows moved to — is what selects, so the
  // arrow keys move the cursor through the grid without changing what the detail pane shows.
  const itemProps = useCallback(
    (id: string) => ({ 'aria-selected': id === selected, 'onActivate': () => onSelect?.(id) }),
    [selected, onSelect],
  );

  return (
    <Masonry.Root Tile={Tile}>
      <Masonry.Content>
        <Masonry.Viewport items={[...entries]} getId={(entry: Entry) => entry.value} itemProps={itemProps} />
      </Masonry.Content>
    </Masonry.Root>
  );
};
