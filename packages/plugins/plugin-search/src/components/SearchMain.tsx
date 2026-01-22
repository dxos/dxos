//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { Obj, Query } from '@dxos/echo';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-searchlist';
import { StackItem } from '@dxos/react-ui-stack';
import { Text } from '@dxos/schema';

import { useGlobalSearch, useGlobalSearchResults, useWebSearch } from '../hooks';
import { meta } from '../meta';

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

  const allResults = [...results, ...webResults];

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      setMatch?.(text);
    },
    [setMatch],
  );

  return (
    <StackItem.Content>
      <SearchList.Root onSearch={handleSearch} classNames='flex flex-col bs-full overflow-hidden'>
        <SearchList.Input placeholder={t('search placeholder')} classNames='pli-2' />
        <SearchList.Content classNames='overflow-y-auto'>
          <SearchList.Viewport>
            {/* TODO(burdon): Support selection on search results. */}
            {allResults
              .filter((item) => Obj.getLabel(item.object))
              .map((item) => (
                <div key={item.id} role='none' className='pli-2 first:pbs-2 pbe-2'>
                  <Surface role='card' data={{ subject: item.object }} limit={1} />
                </div>
              ))}
            {allResults.length === 0 && <SearchList.Empty>{t('empty results message')}</SearchList.Empty>}
          </SearchList.Viewport>
        </SearchList.Content>
      </SearchList.Root>
    </StackItem.Content>
  );
};
