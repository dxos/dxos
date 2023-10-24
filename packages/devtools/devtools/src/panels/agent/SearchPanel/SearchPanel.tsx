//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { log } from '@dxos/log';
import { type SearchResponse } from '@dxos/protocols/proto/dxos/agent/search';
import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';
import { Toolbar } from '@dxos/react-ui';

import { JsonView, PanelContainer, Searchbar } from '../../../components';

export const SearchPanel = () => {
  const client = useClient();
  const [seachResult, setSearchResult] = useState<SearchResponse>();

  useAsyncEffect(async () => {
    await client.spaces.isReady.wait();
    await client.spaces.default.waitUntilReady();
    const unsubscribe = client.spaces.default.listen('dxos.agent.search-plugin', (data) => {
      log.info('response', { data });
      if (data.payload['@type'] === 'dxos.agent.search.SearchResponse') {
        setSearchResult(data.payload);
      }
    });
    return () => unsubscribe();
  }, []);

  const search = async (query: string) => {
    await client.spaces.isReady.wait();
    await client.spaces.default.waitUntilReady();
    log.info('search', { query });
    await client.spaces.default.postMessage('dxos.agent.search-plugin', {
      '@type': 'dxos.agent.search.SearchRequest',
      query,
    });
  };

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <Searchbar onChange={search} />
        </Toolbar.Root>
      }
    >
      <JsonView data={seachResult} />
    </PanelContainer>
  );
};
