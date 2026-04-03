//
// Copyright 2023 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Entity, Query } from '@dxos/echo';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { Card, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Menu } from '@dxos/react-ui-menu';
import { type MosaicTileProps, Mosaic, useMosaicContainer, Focus } from '@dxos/react-ui-mosaic';
import { SearchList, type SearchResult } from '@dxos/react-ui-search';
import { Text } from '@dxos/schema';
import { composable, composableProps } from '@dxos/ui-theme';
import { getHostPlatform, isTauri } from '@dxos/util';

import { useGlobalSearch, useGlobalSearchResults, useWebSearch } from '../../hooks';

export type SearchArticleProps = {
  space?: Space;
};

export const SearchArticle = ({ space }: SearchArticleProps) => {
  // TODO(burdon): Option to query across spaces.
  const [query, setQuery] = useState<string>();
  // TODO(burdon): Re-enable full-text search when indexer is available in all environments.
  const objects = useQuery(
    space?.db,
    query === undefined ? Query.select(Filter.nothing()) : Query.select(Filter.not(Filter.type(Text.Text))),
  );

  const { setMatch } = useGlobalSearch();
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
      <Panel.Root>
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

export type SearchResultStackProps = {
  results: SearchResult[];
};

const SearchResultStack = composable<HTMLDivElement, SearchResultStackProps>(({ results, ...props }, forwardedRef) => {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const items = useMemo(() => results.map((result) => ({ result })), [results]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      (document.activeElement as HTMLElement | null)?.click();
    }
  }, []);

  return (
    <Focus.Group asChild {...composableProps(props)} onKeyDown={handleKeyDown} ref={forwardedRef}>
      <Mosaic.Container asChild>
        <ScrollArea.Root orientation='vertical' padding centered>
          <ScrollArea.Viewport ref={setViewport}>
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
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Mosaic.Container>
    </Focus.Group>
  );
});

SearchResultStack.displayName = 'SearchResultStack';

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
      <Menu.Root>
        <Mosaic.Tile
          asChild
          classNames='dx-hover dx-current dx-selected'
          id={result.id}
          data={data}
          location={location}
        >
          <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
            <Card.Root ref={forwardedRef} role='button' classNames='cursor-pointer'>
              <Card.Toolbar>
                <Card.IconBlock />
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
          </Focus.Item>
        </Mosaic.Tile>
      </Menu.Root>
    );
  },
);

SearchResultTile.displayName = 'SearchResultTile';
