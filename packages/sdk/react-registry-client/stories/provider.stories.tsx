//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { RegistryTypeRecord, MemoryRegistryClient } from '@dxos/registry-client';

import { RegistryProvider, useRegistry } from '../src';

export default {
  title: 'react-registry-client/RegistryProvider'
};

const TestApp = () => {
  const registry = useRegistry();
  const [types, setTypes] = useState<RegistryTypeRecord[]>([]);

  useEffect(() => {
    setImmediate(async () => {
      const types = await registry.getTypeRecords();
      setTypes(types);
    })
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 8 }}>Domains</div>
      {types.map(({ messageName }) => (
        <div key={messageName}>
          {messageName}
        </div>
      ))}
    </div>
  );
};

export const Primary = () => {
  const registry = new MemoryRegistryClient();

  return (
    <RegistryProvider registry={registry}>
      <TestApp />
    </RegistryProvider>
  );
};
