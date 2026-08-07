//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Entity } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Panel, Toolbar } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-search';
import { getHostPlatform, isTauri } from '@dxos/util';

import { SearchResultStack } from '#components';
import { buildSearchQuery, toSearchResults, useGlobalSearch } from '#hooks';

export const SearchArticle = ({ space }: AppSurface.SpaceArticleProps) => {
  // TODO(burdon): Cross-space search — Milestone 2 (fan-out + merge).
  const [query, setQuery] = useState<string>();
  const objects = useQuery(space.db, buildSearchQuery(query));
  const { setMatch } = useGlobalSearch();
  const results = useMemo(() => (query ? toSearchResults(objects, query) : []), [objects, query]);
  const allResults = useMemo(() => results.filter(({ object }) => object && Entity.getLabel(object)), [results]);

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
          <SearchResultStack results={allResults} query={query ?? ''} />
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

SearchArticle.displayName = 'SearchArticle';
