//
// Copyright 2021 DXOS.org
//

import {
  MemoryRegistryClient,
  createMockTypes,
  createMockResourceRecords
} from '@dxos/registry-client';

export const createMockRegistry = () => {
  return new MemoryRegistryClient(createMockTypes(), createMockResourceRecords());
};
