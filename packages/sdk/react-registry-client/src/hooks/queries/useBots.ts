//
// Copyright 2021 DXOS.org
//

import { raise } from '@dxos/debug';
import { DXN, RegistryDataRecord, Resource } from '@dxos/registry-client';

import { useRegistry } from '../registry';
import { useAsync } from './useAsync';

const BOT_TYPE_DXN = DXN.parse('dxos:type.bot');

export interface BotData {
  dxn: DXN,
  tag?: string,
  version?: string,
  description?: string,
  created?: string
}
export interface Result {
  bots: BotData[],
  error?: unknown
}

const mergeResourceRecords = (records: RegistryDataRecord[], resources: Resource[]) => {
  const bots: BotData[] = [];
  for (const resource of resources) {
    for (const tag of Object.keys(resource.tags)) {
      for (const record of records) {
        if (resource.tags[tag]?.equals(record.cid)) {
          bots.push({
            dxn: resource.id,
            tag,
            description: record.meta.description,
            created: record.meta.created?.toISOString()
          });
        }
      }
    }
    for (const version of Object.keys(resource.versions)) {
      for (const record of records) {
        if (resource.versions[version]?.equals(record.cid)) {
          bots.push({
            dxn: resource.id,
            version,
            description: record.meta.description,
            created: record.meta.created?.toISOString()
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
    const botType = await registry.getResourceRecord(BOT_TYPE_DXN, 'latest') ?? raise(new Error('Bot type not found.'));
    const records = await registry.getDataRecords({ type: botType.record.cid });
    const resources = await registry.queryResources({ type: botType.record.cid });

    const bots = mergeResourceRecords(records, resources);
    return bots;
  }, [], []);

  return {
    bots: data,
    error: error
  };
};
