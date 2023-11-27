//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { getActiveSpace } from '@braneframe/plugin-space';
import { parseGraphPlugin, parseLayoutPlugin, useResolvePlugin } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { DensityProvider } from '@dxos/react-ui';
import { baseSurface, chromeSurface, mx } from '@dxos/react-ui-theme';

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
  const graphPlugin = useResolvePlugin(parseGraphPlugin);
  const layout = layoutPlugin?.provides.layout;
  const graph = graphPlugin?.provides.graph;

  // TODO(burdon): Sometimes undefined (race condition?)
  const space = graph && layout ? getActiveSpace(graph, layout.active) : undefined;
  // console.log(':::', graph && layout?.active, space?.key.truncate());
  // console.log('???', graph && layout?.active && graph.findNode(layout.active));

  // TODO(burdon): Returns ALL objects (e.g., incl. Text objects that are fields of parent objects).
  const { objects } = allSpaces ? client.spaces.query() : space?.db.query() ?? {};
  const results = useSearchResults(objects);

  const [selected, setSelected] = useState<string>();

  // TODO(burdon): Activate and/or filter current main (set context).
  const handleSelect = (id: string) => {
    setSelected((selected) => (selected === id ? undefined : id));
  };

  return (
    <div className={mx('flex flex-col grow h-full overflow-hidden', baseSurface)}>
      <DensityProvider density='coarse'>
        <div className='flex bs-[--topbar-size] border-b mb-2'>
          <Searchbar className='pl-3' variant='subdued' placeholder='Enter regular expression...' onChange={setMatch} />
        </div>
      </DensityProvider>
      {results.length > 0 && (
        <div className={mx('absolute top-[--topbar-size] bottom-0', chromeSurface)}>
          {/* TODO(burdon): Change to popover. */}
          <div className='flex flex-col h-full overflow-hidden'>
            <DensityProvider density='fine'>
              <SearchResults items={results} selected={selected} onSelect={handleSelect} />
            </DensityProvider>
          </div>
        </div>
      )}
    </div>
  );
};
