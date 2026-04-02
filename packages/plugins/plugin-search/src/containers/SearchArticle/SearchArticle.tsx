//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, useCallback, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Entity, Query } from '@dxos/echo';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { Card, Panel, Toolbar } from '@dxos/react-ui';
import { Menu } from '@dxos/react-ui-menu';
import { type MosaicTileProps, Mosaic, useMosaicContainer, Focus } from '@dxos/react-ui-mosaic';
import { SearchList, type SearchResult } from '@dxos/react-ui-search';
import { Text } from '@dxos/schema';
import { getHostPlatform, isTauri } from '@dxos/util';

import { useGlobalSearch, useGlobalSearchResults, useWebSearch } from '../../hooks';

export type SearchArticleProps = {
  space?: Space;
};

export const SearchArticle = ({ space }: SearchArticleProps) => {
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

  const autoFocus = !isTauri() || getHostPlatform() !== 'ios';

  return (
    <SearchList.Root onSearch={handleSearch}>
      <Panel.Root className='dx-container bg-base-surface'>
        <Panel.Content asChild>
          <SearchResultStack results={allResults} />
        </Panel.Content>
        <Panel.Statusbar asChild>
          <Toolbar.Root>
            <SearchList.Input placeholder='Search...' autoFocus={autoFocus} />
          </Toolbar.Root>
        </Panel.Statusbar>
      </Panel.Root>
    </SearchList.Root>
  );
};

//
// SearchResultStack
//

type SearchResultStackProps = {
  results: SearchResult[];
};

const SearchResultStack = ({ results }: SearchResultStackProps) => {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const items = useMemo(() => results.map((result) => ({ result })), [results]);

  return (
    <Mosaic.Container asChild>
      <SearchList.Content>
        <Mosaic.VirtualStack
          Tile={SearchResultTile}
          classNames='my-2'
          gap={8}
          items={items}
          draggable={false}
          getId={(item) => item.result.id}
          getScrollElement={() => viewport}
          estimateSize={() => 150}
        />
      </SearchList.Content>
    </Mosaic.Container>
  );
};

//
// SearchResultTile
//

type SearchResultTileData = {
  result: SearchResult;
};

type SearchResultTileProps = Pick<MosaicTileProps<SearchResultTileData>, 'location' | 'data' | 'current'>;

/**
 * Search result tile that uses Surface to render object content.
 */
const SearchResultTile = forwardRef<HTMLDivElement, SearchResultTileProps>(
  ({ data, location, current }, forwardedRef) => {
    const { result } = data;
    const menuItems = useObjectMenuItems(result.object);
    const { setCurrentId } = useMosaicContainer('SearchResultTile');

    const handleCurrentChange = useCallback(() => {
      setCurrentId(result.id);
    }, [result.id, setCurrentId]);

    return (
      <Mosaic.Tile asChild classNames='dx-hover dx-current' id={result.id} data={data} location={location}>
        <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
          <Menu.Root>
            <Card.Root ref={forwardedRef} role='button' classNames='cursor-pointer'>
              <Card.Toolbar>
                <Card.Title>{result.label ?? (result.object && Entity.getLabel(result.object))}</Card.Title>
                <Menu.Trigger asChild disabled={!menuItems?.length}>
                  <Toolbar.IconButton
                    iconOnly
                    variant='ghost'
                    icon='ph--dots-three-vertical--regular'
                    label='Actions'
                  />
                </Menu.Trigger>
                <Menu.Content items={menuItems} />
              </Card.Toolbar>
              <Surface.Surface role='card--content' data={{ subject: result.object }} limit={1} />
            </Card.Root>
          </Menu.Root>
        </Focus.Item>
      </Mosaic.Tile>
    );
  },
);

SearchResultTile.displayName = 'SearchResultTile';
