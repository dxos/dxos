//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import {
  createMockResourceRecords,
  createMockTypes,
  DXN,
  MemoryRegistryClient
} from '@dxos/registry-client';

const BOT_DXN = 'dxos:type.bot';

export const createMockRegistryWithBots = () => {
  const types = createMockTypes();
  const botTypeRecord = types.find(type => type.messageName === '.dxos.type.Bot');
  assert(botTypeRecord, 'Bot type not found: bot');
  const records = createMockResourceRecords();
  const botTypeResourceRecord = {
    resource: {
      id: DXN.parse(BOT_DXN),
      tags: {
        latest: botTypeRecord.cid
      },
      versions: {}
    },
    record: botTypeRecord
  };
  const memoryRegistryClient = new MemoryRegistryClient([
    ...records,
    botTypeResourceRecord
  ], types);
  return memoryRegistryClient;
};
