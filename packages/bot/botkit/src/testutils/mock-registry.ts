//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import {
  DXN,
  MemoryRegistryClientBackend,
  registerMockRecord,
  registerMockResource,
  registerMockTypes,
  RegistryClient
} from '@dxos/registry-client';

export const MOCK_BOT_DXN = 'dxos:bot:mock';

export const createMockRegistryWithBot = async (botPath: string) => {
  const registry = new RegistryClient(new MemoryRegistryClientBackend());

  await registerMockTypes(registry);
  const types = await registry.getTypeRecords();

  const botType = types.find(({ type }) => type?.messageName === '.dxos.type.Bot');
  assert(botType, 'Bot type not found.');

  const botRecordCid = await registerMockRecord(
    registry,
    {
      typeRecord: botType.cid,
      data: { localPath: botPath },
      meta: { displayName: 'Test Bot' }
    }
  );

  await registerMockResource(registry, {
    name: DXN.parse(MOCK_BOT_DXN),
    record: botRecordCid
  });

  return registry;
};

export const setupMockRegistryWithBot = async (botPath: string) => {
  const registry = await createMockRegistryWithBot(botPath);

  return {
    registry,
    botDXN: MOCK_BOT_DXN
  };
};
