//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { getActiveSpace } from '@braneframe/plugin-space';
import { parseGraphPlugin, parseLayoutPlugin, useResolvePlugin } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { DensityProvider } from '@dxos/react-ui';

import { SearchResults } from './SearchResults';
import { Searchbar } from './Searchbar';
import { useSearch, useSearchResults } from '../context';

export const SearchMain = () => {
  const client = useClient();
  const { setMatch } = useSearch();
  // TODO(burdon): UX to select all spaces.
  const allSpaces = false;

  // TODO(burdon): Query agent/cross-space.
  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  // console.log('layout:', layoutPlugin?.provides.layout.active);
  const graphPlugin = useResolvePlugin(parseGraphPlugin);
  const layout = layoutPlugin?.provides.layout;
  const graph = graphPlugin?.provides.graph;
  const space = layout && graph ? getActiveSpace(graph, layout.active) : undefined;

  // TODO(burdon): Returns ALL objects (e.g., incl. Text objects that are fields of parent objects).
  const { objects } = allSpaces ? client.spaces.query() : space?.db.query() ?? {};
  const results = useSearchResults(objects);

  const [selected, setSelected] = useState<string>();

  // TODO(burdon): Activate and/or filter current main (set context).
  const handleSelect = (id: string) => {
    setSelected((selected) => (selected === id ? undefined : id));
  };

  return (
    <div className='flex flex-col grow h-full overflow-hidden divide-y'>
      <DensityProvider density='coarse'>
        <Searchbar className='pl-3' variant='subdued' placeholder='Enter regular expression...' onChange={setMatch} />
      </DensityProvider>
      <DensityProvider density='fine'>
        <SearchResults items={results} selected={selected} onSelect={handleSelect} />
      </DensityProvider>
    </div>
  );
};
