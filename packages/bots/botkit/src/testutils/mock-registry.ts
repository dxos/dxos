//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import {
  AccountKey,
  DXN,
  MemoryRegistryClientBackend,
  registerMockRecord,
  registerMockResource,
  registerMockTypes,
  RegistryClient
} from '@dxos/registry-client';

export const MOCK_BOT_DXN = 'example:bot/mock';

export const createMockRegistryWithBot = async (botPath: string) => {
  const mock = new MemoryRegistryClientBackend();
  const registry = new RegistryClient(mock);

  const owner = AccountKey.random();
  await mock.registerDomainName('example', owner);

  await registerMockTypes(registry);
  const types = await registry.listTypeRecords();

  const botType = types.find(
    ({ type }) => type?.messageName === '.dxos.type.Bot'
  );
  assert(botType, 'Bot type not found.');

  const botRecordCid = await registerMockRecord(registry, {
    typeRecord: botType.cid,
    data: { localPath: botPath },
    meta: { displayName: 'Test Bot' }
  });

  await registerMockResource(registry, {
    name: DXN.parse(MOCK_BOT_DXN).with({ tag: 'latest' }),
    record: botRecordCid,
    owner
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
