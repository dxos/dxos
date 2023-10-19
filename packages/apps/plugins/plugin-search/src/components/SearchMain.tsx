//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import type { SpacePluginProvides } from '@braneframe/plugin-space';
import { DensityProvider } from '@dxos/aurora';
import { usePlugin } from '@dxos/react-surface';

import { SearchResults } from './SearchResults';
import { Searchbar } from './Searchbar';
import { useSearchResults, useSearch } from '../types';

export const SearchMain = () => {
  const { setMatch } = useSearch();

  // TODO(burdon): Cross-space query.
  // TODO(burdon): Query agent.
  const spacePlugin = usePlugin<SpacePluginProvides>('dxos.org/plugin/space');
  const space = spacePlugin?.provides.space.active;
  const { objects } = space?.db.query() ?? {};
  const results = useSearchResults(objects);

  const [selected, setSelected] = useState<string>();

  // TODO(burdon): Activate and/or filter current main (set context).
  const handleSelect = (id: string) => {
    console.log('select', id);
    setSelected(id);
  };

  return (
    <div className='flex flex-col grow h-full overflow-hidden'>
      <DensityProvider density='coarse'>
        <Searchbar className='pl-3' variant='subdued' placeholder='Enter regular expression...' onChange={setMatch} />
      </DensityProvider>
      <DensityProvider density='fine'>
        <SearchResults items={results} selected={selected} onSelect={handleSelect} />
      </DensityProvider>
    </div>
  );
};
