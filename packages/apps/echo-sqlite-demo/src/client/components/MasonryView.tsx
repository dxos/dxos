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
  const Tile = useCallback(
    ({ data }: { data: Entry }) => (
      <EntryCard entry={data} selected={data.value === selected} onSelect={onSelect} onRemove={onRemove} />
    ),
    [selected, onSelect, onRemove],
  );

  return (
    <Masonry.Root Tile={Tile}>
      <Masonry.Content>
        <Masonry.Viewport items={[...entries]} getId={(entry: Entry) => entry.value} />
      </Masonry.Content>
    </Masonry.Root>
  );
};
