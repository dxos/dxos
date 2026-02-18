//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { Entity, Query } from '@dxos/echo';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { Layout } from '@dxos/react-ui';
import { Card, Mosaic, type StackTileComponent } from '@dxos/react-ui-mosaic';
import { SearchList } from '@dxos/react-ui-searchlist';
import { Text } from '@dxos/schema';

import { useGlobalSearch, useGlobalSearchResults, useWebSearch } from '../hooks';
import { meta } from '../meta';
import { type SearchResult } from '../types';

export const SearchMain = ({ space }: { space?: Space }) => {
  const { t } = useTranslation(meta.id);
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
            .referencedBy('dxos.org/type/Document', 'content'),
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

  return (
    <Layout.Main toolbar>
      <SearchList.Root onSearch={handleSearch}>
        <Toolbar.Root>
          <SearchList.Input placeholder={t('search placeholder')} />
        </Toolbar.Root>
        <SearchList.Content>
          <Mosaic.Container asChild>
            <ScrollArea.Root orientation='vertical'>
              <ScrollArea.Viewport>
                <Mosaic.Stack items={allResults} getId={(result) => result.object!.id} Tile={SearchResultTile} />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
          {allResults.length === 0 && <SearchList.Empty>{t('empty results message')}</SearchList.Empty>}
        </SearchList.Content>
      </SearchList.Root>
    </Layout.Main>
  );
};

const SearchResultTile: StackTileComponent<SearchResult> = ({ data }) => {
  return (
    <Card.Root key={data.id}>
      <Card.Toolbar>
        <Card.DragHandle />
        <Card.Title>{data.label ?? (data.object && Entity.getLabel(data.object))}</Card.Title>
        <Card.Menu />
      </Card.Toolbar>
      <Surface.Surface role='card--content' data={{ subject: data.object }} limit={1} />
    </Card.Root>
  );
};
