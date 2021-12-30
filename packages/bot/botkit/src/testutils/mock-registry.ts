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
import { randomInt } from '@dxos/util';

export const MOCK_BOT_DXN = 'dxos:bot:mock';

export const createMockRegistryWithBot = (botPath: string) => {
  const types = createMockTypes();
  const botTypeRecord = types.find(type => type.messageName === 'bot');
  assert(botTypeRecord, 'Bot type not found: bot');
  const records = createMockResourceRecords();
  const botRecord = createMockResourceRecord({
    _typeCID: botTypeRecord.cid,
    _dxn: DXN.parse(MOCK_BOT_DXN),
    _data: {
      localPath: botPath
    }
  });
  const memoryRegistryClient = new MemoryRegistryClient(
    types,
    [...records, botRecord]
  );
  return memoryRegistryClient;
};

export const setupMockRegistryWithBot = async (botPath: string) => {
  const registry = createMockRegistryWithBot(botPath);

  return {
    registry,
    botDXN: MOCK_BOT_DXN
  };
};
