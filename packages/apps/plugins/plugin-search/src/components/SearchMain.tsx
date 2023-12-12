//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { getActiveSpace } from '@braneframe/plugin-space';
import { parseGraphPlugin, parseLayoutPlugin, useResolvePlugin } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { DensityProvider, useTranslation } from '@dxos/react-ui';
import { groupSurface, mx } from '@dxos/react-ui-theme';

import { SearchResults } from './SearchResults';
import { Searchbar } from './Searchbar';
import { useSearch, useSearchResults } from '../context';
import { SEARCH_PLUGIN } from '../meta';

export const SearchMain = () => {
  const { t } = useTranslation(SEARCH_PLUGIN);
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
  console.log(':::', graph && layout?.active, space?.key.truncate());
  console.log('???', graph && layout?.active && graph.findNode(layout.active));

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
