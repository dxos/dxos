//
// Copyright 2023 DXOS.org
//

import React, { type FC, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { DensityProvider, useTranslation } from '@dxos/react-ui';
import { groupSurface, mx } from '@dxos/react-ui-theme';

import { SearchResults } from './SearchResults';
import { Searchbar } from './Searchbar';
import { useSearch, useSearchResults } from '../context';
import { SEARCH_PLUGIN } from '../meta';

export const SearchMain: FC<{ space: Space }> = ({ space }) => {
  const { t } = useTranslation(SEARCH_PLUGIN);
  const client = useClient();
  const { setMatch } = useSearch();
  // TODO(burdon): UX to select all spaces.
  const allSpaces = false;

  // TODO(burdon): Returns ALL objects (e.g., incl. Text objects that are fields of parent objects).
  const { objects } = allSpaces ? client.spaces.query() : space?.db.query() ?? {};
  const results = useSearchResults(objects);

  const [selected, setSelected] = useState<string>();

  // TODO(burdon): Activate and/or filter current main (set context).
  const handleSelect = (id: string) => {
    setSelected((selected) => (selected === id ? undefined : id));
  };

  return (
    <div className='flex flex-col grow h-full overflow-hidden'>
      <DensityProvider density='fine'>
        <div className={mx('flex bs-[--topbar-size] px-2 py-2')}>
          <Searchbar
            classes={{ root: 'rounded shadow' }}
            variant='subdued'
            placeholder={t('search placeholder')}
            onChange={setMatch}
          />
        </div>
      </DensityProvider>
      {results.length > 0 && (
        <div className='absolute top-[--topbar-size] bottom-0 z-[1]'>
          {/* TODO(burdon): Change to Portal? */}
          <div className={mx('flex flex-col h-full overflow-hidden', groupSurface)}>
            <DensityProvider density='fine'>
              <SearchResults items={results} selected={selected} onSelect={handleSelect} />
            </DensityProvider>
          </div>
        </div>
      )}
    </div>
  );
};
