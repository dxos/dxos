//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { DXN } from '@dxos/registry-client';

import { Bot } from '../../proto/gen/dxos/type';
import { useRegistry } from '../registry';
import { useAsync } from './useAsync';

const BOT_DXN = DXN.parse('dxos:type.bot');

interface Result {
  bots: Bot[],
  error?: unknown
}

/**
 * Returns info about bot records.
 */
export const useBots = (): Result => {
  const registry = useRegistry();
  const { data, error } = useAsync(async () => {
    const botType = await registry.getResourceRecord(BOT_DXN, 'latest');
    assert(botType, `Bot type not found: ${BOT_DXN}`);
    const bots = await registry.getDataRecords<Bot>({ type: botType.record.cid });
    return bots.map(bot => bot.data);
  }, [], []);

  return {
    bots: data,
    error: error
  };
};
