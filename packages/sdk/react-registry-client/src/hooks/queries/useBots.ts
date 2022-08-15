//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { DXN, RegistryRecord, ResourceSet } from '@dxos/registry-client';

import { useRegistry } from '../registry';
import { useAsync } from './useAsync';

const BOT_TYPE_DXN = DXN.parse('dxos:type/bot');

export interface BotData {
  dxn: DXN
  tag?: string
  version?: string
  description?: string
  created?: string
}
export interface Result {
  bots: BotData[]
  error?: unknown
}

const mergeResourceRecords = (records: RegistryRecord[], resources: ResourceSet[]) => {
  const bots: BotData[] = [];
  for (const resource of resources) {
    for (const tag of Object.keys(resource.tags)) {
      for (const record of records) {
        if (resource.tags[tag]?.equals(record.cid)) {
          bots.push({
            dxn: resource.name,
            tag,
            description: record.description,
            created: record.created?.toISOString()
          });
        }
      }
    }
  }
  return bots;
};

/**
 * Returns info about bot records.
 */
export const useBots = (): Result => {
  const registry = useRegistry();
  const { data, error } = useAsync(async () => {
    const botType = await registry.getResource(BOT_TYPE_DXN);
    assert(botType, new Error('Bot type not found.'));
    const records = await registry.listRecords({ type: botType });
    const resources = await registry.listResources();

    const bots = mergeResourceRecords(records, resources);
    return bots;
  }, [], []);

  return {
    bots: data,
    error: error
  };
};
