//
// Copyright 2020 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';
import React, { useMemo } from 'react';

import { EDGE_URLS, SaveConfig, Storage } from '@dxos/config';
import { useConfig } from '@dxos/react-client';

import { Select } from '../components/index.ts';
import { getTarget } from './VaultSelector.tsx';

const edgeServers = [
  { value: EDGE_URLS.local, label: 'Local' },
  { value: EDGE_URLS.dev, label: 'Dev' },
  { value: EDGE_URLS.preview, label: 'Preview' },
  { value: EDGE_URLS.production, label: 'Production' },
];

export const EdgeSelector = () => {
  const config = useConfig();
  const target = useMemo(() => getTarget(), [window.location.search]);

  const handleSetSignalServer = async (value: string) => {
    const existing = await Storage();
    await SaveConfig(
      defaultsDeep(
        {
          runtime: {
            services: {
              edge: { url: value },
            },
          },
        },
        existing,
      ),
    );
    window.location.reload();
  };

  return (
    <Select
      disabled={target.value !== 'default'}
      value={config.values.runtime?.services?.edge?.url}
      items={edgeServers}
      onValueChange={(value) => handleSetSignalServer(value)}
    />
  );
};
