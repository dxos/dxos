//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import {
  createMockResourceRecord,
  createMockResourceRecords,
  createMockTypes,
  DXN,
  MemoryRegistryClient
} from '@dxos/registry-client';

export const MOCK_BOT_DXN = 'dxos:bot:mock';

export const createMockRegistryWithBot = (botPath: string) => {
  const types = createMockTypes();
  const botTypeRecord = types.find(type => type.messageName === '.dxos.type.Bot');
  assert(botTypeRecord, 'Bot type not found.');
  const records = createMockResourceRecords();
  const botRecord = createMockResourceRecord({
    type: '.dxos.type.Bot',
    dxn: DXN.parse(MOCK_BOT_DXN),
    data: {
      localPath: botPath
    }
  });

  return new MemoryRegistryClient([...records, botRecord]);
};

export const setupMockRegistryWithBot = async (botPath: string) => {
  const registry = createMockRegistryWithBot(botPath);

  return {
    registry,
    botDXN: MOCK_BOT_DXN
  };
};
