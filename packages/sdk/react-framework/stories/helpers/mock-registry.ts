//
// Copyright 2021 DXOS.org
//

import {
  MemoryRegistryClient,
  createMockResourceRecords
} from '@dxos/registry-client';

export const createMockRegistry = () => {
  return new MemoryRegistryClient(createMockResourceRecords());
};
