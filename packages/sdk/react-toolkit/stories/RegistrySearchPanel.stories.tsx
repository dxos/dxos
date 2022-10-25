//
// Copyright 2021 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { Box } from '@mui/material';

import { useAsyncEffect } from '@dxos/react-async';
import { RegistryProvider } from '@dxos/react-registry-client';
import { RegistryType, ResourceSet } from '@dxos/registry-client';

import { RegistrySearchPanel, useRegistrySearchModel } from '../src';
import { createMockRegistry } from './helpers';

export default {
  title: 'react-toolkit/RegistrySearchPanel'
};

export const Primary = () => {
  const registry = useMemo(() => createMockRegistry(), []);
  const model = useRegistrySearchModel(registry);
  const [selected, setSelected] = useState<ResourceSet>();

  const [types, setTypes] = useState<RegistryType[]>([]);
  useAsyncEffect(async () => {
    await model.initialize();
    setTypes(model.types);
  }, []);

  return (
    <RegistryProvider registry={registry}>
      <Box sx={{ margin: 2 }}>
        <RegistrySearchPanel
          model={model}
          types={types} // TODO(burdon): Factor out type selector.
          onSelect={(resource) => setSelected(resource)}
        />

        <Box sx={{ marginTop: 2 }}>{selected?.name.toString()}</Box>
      </Box>
    </RegistryProvider>
  );
};

export const WithVersions = () => {
  const registry = useMemo(() => createMockRegistry(), []);
  const model = useRegistrySearchModel(registry);
  const [selected, setSelected] = useState<string>();

  useAsyncEffect(async () => {
    await model.initialize();
  }, []);

  return (
    <RegistryProvider registry={registry}>
      <Box sx={{ margin: 2 }}>
        <RegistrySearchPanel
          model={model}
          versions
          onSelect={(resource, version) =>
            setSelected(`${resource.name.toString()}@${version}`)
          }
        />

        <Box sx={{ marginTop: 2 }}>{selected}</Box>
      </Box>
    </RegistryProvider>
  );
};
