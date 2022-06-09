//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { MemoryRegistryClientBackend, registerMockTypes, RegistryClient } from '@dxos/registry-client';

export const createMockRegistry = () => {
  return new RegistryClient(new MemoryRegistryClientBackend());
};

// TODO(burdon): Move to registry-client testing package.
export const createMockRegistryWithBot = async () => {
  const registry = new RegistryClient(new MemoryRegistryClientBackend());

  await registerMockTypes(registry);
  const types = await registry.getTypeRecords();

  const botType = types.find(({ type }) => type?.messageName === '.dxos.type.Bot');
  assert(botType, 'Bot type not found.');

  return registry;
};
