//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { createMockResourceRecords, createMockTypes, DXN, MemoryRegistryClient } from '@dxos/registry-client';

export const createMockRegistry = () => {
  return new MemoryRegistryClient();
};

// TODO(burdon): Move to registry-client testing package.
export const createMockRegistryWithBots = () => {
  const types = createMockTypes();
  const botTypeRecord = types.find(type => type.messageName === '.dxos.type.Bot');
  assert(botTypeRecord, 'Bot type not found: bot');
  const records = createMockResourceRecords();
  const botTypeResourceRecord = {
    resource: {
      id: DXN.parse('dxos:type.bot'),
      tags: {
        latest: botTypeRecord.cid
      },
      versions: {}
    },
    record: botTypeRecord
  };

  return new MemoryRegistryClient([...records, botTypeResourceRecord], types);
};
