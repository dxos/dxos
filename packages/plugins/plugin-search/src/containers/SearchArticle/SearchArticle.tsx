//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Entity, Query } from '@dxos/echo';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-search';
import { Text } from '@dxos/schema';
import { isTauri, getHostPlatform } from '@dxos/util';

import { SearchResultStack } from '../../components';
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

  // TODO(burdon): Move current up/down without losing focus.
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
