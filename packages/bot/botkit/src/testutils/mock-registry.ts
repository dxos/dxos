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
export const MOCK_BOT_HASH = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';

export const createMockRegistryWithBots = () => {
  const types = createMockTypes();
  const botTypeRecord = types.find(type => type.messageName === 'bot');
  assert(botTypeRecord, 'Bot type not found: bot');
  const records = createMockResourceRecords();
  const botRecord = createMockResourceRecord({
    _typeCID: botTypeRecord.cid,
    _dxn: DXN.parse(MOCK_BOT_DXN),
    _data: {
      hash: MOCK_BOT_HASH
    }
  });
  const memoryRegistryClient = new MemoryRegistryClient(
    types,
    [...records, botRecord]
  );
  return memoryRegistryClient;
};
