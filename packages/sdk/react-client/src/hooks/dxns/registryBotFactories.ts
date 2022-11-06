//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import { useState, useEffect } from 'react';

import { QueryRecord, DXOS_TYPE_BOT_FACTORY } from './types';
import { useRegistry } from './useRegistry';

const log = debug('dxos:react-client');

/**
 * A hook returning all bot factories registered on the DXNS registry.
 * Bot factories are used for spawning bots into Parties.
 * See also: `useRegistryBots` hook.
 * @deprecated
 */
interface RegistryBotFactoryRecord {
  topic: string;
  name?: string;
  names: string[];
}

export const useRegistryBotFactories = () => {
  const registry = useRegistry();
  const [factories, setFactories] = useState<RegistryBotFactoryRecord[]>([]);

  useEffect(() => {
    if (!registry) {
      return;
    }

    const queryRegistry = async () => {
      let factoriesResult: QueryRecord[];
      try {
        factoriesResult = await registry.queryRecords({
          type: DXOS_TYPE_BOT_FACTORY
        });
      } catch (e: any) {
        log('Querying bot factories unsuccessful.');
        log(e);
        return;
      }
      setFactories(
        factoriesResult.map(({ attributes: { topic, name }, names }) => ({
          topic,
          name,
          names
        }))
      );
    };

    void queryRegistry();
  }, [registry]);

  return factories;
};
