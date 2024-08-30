//
// Copyright 2023 DXOS.org
//

import React, { type FC, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { useQuery, type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { groupSurface, mx } from '@dxos/react-ui-theme';

import { SearchResults } from './SearchResults';
import { Searchbar } from './Searchbar';
import { useGlobalSearch, useGlobalSearchResults } from '../context';
import { SEARCH_PLUGIN } from '../meta';

export const SearchMain: FC<{ space: Space }> = ({ space }) => {
  const { t } = useTranslation(SEARCH_PLUGIN);
  const client = useClient();
  const { setMatch } = useGlobalSearch();
  // TODO(burdon): UX to select all spaces.
  const allSpaces = false;

  // TODO(burdon): Returns ALL objects (e.g., incl. Text objects that are fields of parent objects).
  const objects = useQuery(allSpaces ? client.spaces : space);
  const results = useGlobalSearchResults(objects);

  const [selected, setSelected] = useState<string>();

  // TODO(burdon): Activate and/or filter current main (set context).
  const handleSelect = (id: string) => {
    setSelected((selected) => (selected === id ? undefined : id));
  };

  return (
    <div className='flex flex-col grow h-full'>
      <Searchbar placeholder={t('search placeholder')} onChange={setMatch} />
      {results.length > 0 && (
        <div className='absolute top-[--topbar-size] bottom-0 z-[1]'>
          {/* TODO(burdon): Change to Portal? */}
          <div className={mx('flex flex-col h-full overflow-hidden', groupSurface)}>
            <SearchResults items={results} selected={selected} onSelect={handleSelect} />
          </div>
        </div>
      )}
    </div>
  );
};
