//
// Copyright 2021 DXOS.org
//

import { MemoryRegistryClient } from '@dxos/registry-client';

export const createMockRegistry = () => {
  return new MemoryRegistryClient();
};
