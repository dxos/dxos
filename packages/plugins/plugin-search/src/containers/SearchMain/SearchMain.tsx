//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Entity, Query } from '@dxos/echo';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { Card, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Menu } from '@dxos/react-ui-menu';
import { Mosaic, type MosaicStackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchPanel } from '@dxos/react-ui-search';
import { Text } from '@dxos/schema';

import { useGlobalSearch, useGlobalSearchResults, useWebSearch } from '../../hooks';
import { type SearchResult } from '../../types';

export type SearchMainProps = {
  space?: Space;
};

export const SearchMain = ({ space }: SearchMainProps) => {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  const { setMatch } = useGlobalSearch();
  const [query, setQuery] = useState<string>();
  // TODO(burdon): Option to search across spaces.
  const objects = useQuery(
    space?.db,
    query === undefined
      ? Query.select(Filter.nothing())
      : // TODO(dmaretskyi): Final version would walk the ancestry of the object until we find a non-system type.
        Query.all(
          Query.select(Filter.text(query, { type: 'full-text' })).select(Filter.not(Filter.type(Text.Text))),
          Query.select(Filter.text(query, { type: 'full-text' }))
            .select(Filter.type(Text.Text))
            .referencedBy('org.dxos.type.document', 'content'),
        ),
  );

  const results = useGlobalSearchResults(objects);
  const { results: webResults } = useWebSearch({ query });
  const allResults = useMemo(
    () => [...results, ...webResults].filter(({ object }) => object && Entity.getLabel(object)),
    [results, webResults],
  );

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      setMatch?.(text);
    },
    [setMatch],
  );

  // TODO(burdon): Factor out into SearchList (rename SearchStack). Consider mobile variant (search position).
  return (
    <SearchPanel onSearch={handleSearch}>
      <Mosaic.Container asChild>
        <ScrollArea.Root thin padding centered>
          <ScrollArea.Viewport ref={setViewport}>
            <Mosaic.VirtualStack
              Tile={SearchResultTile}
              classNames='my-2'
              gap={8}
              items={allResults}
              draggable={false}
              getId={(item) => item.object.id}
              getScrollElement={() => viewport}
              estimateSize={() => 150}
            />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Mosaic.Container>
    </SearchPanel>
  );
};

// TODO(burdon): Implement Tile.
const SearchResultTile: MosaicStackTileComponent<SearchResult> = ({ data }) => {
  const menuItems = useObjectMenuItems(data.object);

  return (
    <Menu.Root>
      <Card.Root key={data.id} role='button' classNames='cursor-pointer'>
        <Card.Toolbar>
          <Card.DragHandle />
          <Card.Title>{data.label ?? (data.object && Entity.getLabel(data.object))}</Card.Title>
          {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
          <Menu.Trigger asChild disabled={!menuItems?.length}>
            <Toolbar.IconButton iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label='Actions' />
          </Menu.Trigger>
          <Menu.Content items={menuItems} />
        </Card.Toolbar>
        <Surface.Surface role='card--content' data={{ subject: data.object }} limit={1} />
      </Card.Root>
    </Menu.Root>
  );
};
