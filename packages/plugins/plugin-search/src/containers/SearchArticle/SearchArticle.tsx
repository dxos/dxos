//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ObjectCombobox from '@dxos/app-toolkit/ObjectCombobox';
import { Entity } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { SearchList } from '@dxos/react-ui-search';
import * as Icon from '@dxos/react-ui/Icon';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { getHostPlatform, isTauri } from '@dxos/util';

import { SearchResultStack } from '#components';
import { toSearchResults, useGlobalSearch } from '#hooks';

export const SearchArticle = ({ space }: AppSurface.SpaceArticleProps) => {
  // TODO(burdon): Cross-space search — Milestone 2 (fan-out + merge).
  const [query, setQuery] = useState<string>();
  // Scope the FTS query to user-facing types so results match what the app can render.
  const typeUris = ObjectCombobox.useListedTypeUris(space.db);
  ObjectCombobox.useDrainedSearchIndex(space.db);
  const objects = useQuery(space.db, ObjectCombobox.searchQuery(query, typeUris));
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
        <Panel.Header>
          <Toolbar.Root>
            <SearchList.Input
              placeholder='Search...'
              autoFocus={autoFocus}
              end={<Icon.Icon icon='ph--magnifying-glass--regular' />}
            />
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body asChild>
          <SearchResultStack results={allResults} query={query ?? ''} />
        </Panel.Body>
      </Panel.Root>
    </SearchList.Root>
  );
};

SearchArticle.displayName = 'SearchArticle';
