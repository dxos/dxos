//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { RegistryProvider, useRegistry } from '../src';
import { MemoryRegistryClient } from '@dxos/registry-client';

export default {
  title: 'RegistryProvider'
};

const TestApp = () => {
  const regsitry = useRegistry();

  return (
    <div>{String(regsitry)}</div>
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
