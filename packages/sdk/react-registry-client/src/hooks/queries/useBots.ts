//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { DXN } from '@dxos/registry-client';

import { Bot } from '../../proto/gen/dxos/type';
import { useRegistry } from '../registry';
import { useAsync } from './useAsync';

const BOT_DXN = 'dxos:type.bot';

interface Result {
  bots: Bot[],
  error?: unknown
}

/**
 * Returns info about bot records.
 */
export const useBots = (): Result => {
  const registry = useRegistry();
  const data = useAsync(async () => {
    const botType = await registry.getResourceRecord(DXN.parse(BOT_DXN), 'latest');
    assert(botType, `Bot type not found: ${BOT_DXN}`);
    const bots = await registry.getDataRecords({ type: botType.record.cid });
    return bots.map(bot => bot.data) as Bot[];
  }, [], []);

  return {
    bots: data.data,
    error: data.error
  };
};
