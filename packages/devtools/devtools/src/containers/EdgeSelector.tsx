//
// Copyright 2020 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';
import React, { useMemo } from 'react';

import { SaveConfig, Storage } from '@dxos/config';
import { useConfig } from '@dxos/react-client';

import { Select } from '../components';

import { getTarget } from './VaultSelector';

const edgeServers = [
  { value: 'https://edge.dxos.workers.dev', label: 'Dev' },
  { value: 'https://edge-main.dxos.workers.dev', label: 'Main' },
  { value: 'https://edge-labs.dxos.workers.dev', label: 'Labs' },
  { value: 'https://edge-production.dxos.workers.dev', label: 'Production' },
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
