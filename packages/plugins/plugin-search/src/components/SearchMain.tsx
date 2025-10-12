//
// Copyright 2023 DXOS.org
//

import React, { type FC, useState } from 'react';

import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { activeSurface, mx } from '@dxos/react-ui-theme';

import { useGlobalSearch, useGlobalSearchResults } from '../hooks';
import { useWebSearch } from '../hooks/useWebSearch';
import { meta } from '../meta';

import { Searchbar } from './Searchbar';
import { SearchResults } from './SearchResults';

export const SearchMain: FC<ThemedClassName<{ space: Space }>> = ({ classNames, space }) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const { setMatch } = useGlobalSearch();
  const [query, setQuery] = useState<string>();
  // TODO(burdon): UX to select all spaces.
  const allSpaces = false;

  // TODO(burdon): Returns ALL objects (e.g., incl. Text objects that are fields of parent objects).
  const objects = useQuery(allSpaces ? client.spaces : space, Filter.everything());
  const results = useGlobalSearchResults(objects);

  const {
    runSearch,
    results: webResults,
    isLoading,
  } = useWebSearch({
    query,
  });

  const [selected, setSelected] = useState<string>();

  // TODO(burdon): Activate and/or filter current main (set context).
  const handleSelect = (id: string) => {
    setSelected((selected) => (selected === id ? undefined : id));
  };

  const allResults = [...results, ...webResults];
  log.info('results', { results, webResults });

  return (
    <div className={mx('flex flex-col grow h-full overflow-hidden', classNames)}>
      <Searchbar
        placeholder={t('search placeholder')}
        onChange={(text) => {
          setQuery(text);
          setMatch?.(text);
        }}
        onSubmit={runSearch}
      />
      {isLoading && <div className={mx('flex flex-col grow overflow-hidden', activeSurface)}>Loading...</div>}
      {allResults.length > 0 && (
        <div className={mx('flex flex-col grow overflow-hidden', activeSurface)}>
          <SearchResults items={allResults} selected={selected} onSelect={handleSelect} />
        </div>
      )}
    </div>
  );
};
