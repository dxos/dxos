//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { DomainInfo, MemoryRegistryClient } from '@dxos/registry-client';

import { RegistryProvider, useRegistry } from '../src'; // TODO(burdon): ???

export default {
  title: 'RegistryProvider'
};

const TestApp = () => {
  const registry = useRegistry();
  const [domains, setDomains] = useState<DomainInfo[]>([]);

  useEffect(() => {
    setImmediate(async () => {
      const domains = await registry.getDomains();
      setDomains(domains);
    })
  }, []);

  return (
    <pre>{JSON.stringify(domains, undefined, 2)}</pre>
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
