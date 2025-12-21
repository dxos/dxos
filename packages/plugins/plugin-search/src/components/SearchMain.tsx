//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { useClient } from '@dxos/react-client';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { mx } from '@dxos/ui-theme';

import { useGlobalSearch, useGlobalSearchResults, useWebSearch } from '../hooks';
import { meta } from '../meta';

import { Searchbar } from './Searchbar';
import { SearchResults } from './SearchResults';

export const SearchMain = ({ space }: { space?: Space }) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const { setMatch } = useGlobalSearch();
  const [query, setQuery] = useState<string>();
  // TODO(burdon): Option to search across spaces.
  const allSpaces = false;
  const objects = useQuery(allSpaces ? client.spaces : space?.db, Filter.everything());
  const results = useGlobalSearchResults(objects);

  const { runSearch, results: webResults } = useWebSearch({ query });

  // TODO(burdon): Activate and/or filter current main (set context).
  const [selected, setSelected] = useState<string>();
  const handleSelect = (id: string) => {
    setSelected((selected) => (selected === id ? undefined : id));
  };

  const allResults = [...results, ...webResults];

  return (
    <StackItem.Content toolbar>
      <Searchbar
        classNames='pli-2'
        placeholder={t('search placeholder')}
        delay={300}
        onChange={(text) => {
          setQuery(text);
          setMatch?.(text);
        }}
        onSubmit={runSearch}
      />

      {allResults.length > 0 && (
        <div className={mx('flex flex-col bs-full overflow-hidden')}>
          <SearchResults items={allResults} selected={selected} onSelect={handleSelect} />
        </div>
      )}
    </StackItem.Content>
  );
};
