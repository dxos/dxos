//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import { useState, useEffect } from 'react';

import { useRegistry } from './registry';
import { QueryRecord, WRN_TYPE_BOT_FACTORY } from './types';

const log = debug('dxos:react-client');

interface RegistryBotFactoryRecord {
  topic: string,
  name?: string,
  names: string[]
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
        factoriesResult = await registry.queryRecords({ type: WRN_TYPE_BOT_FACTORY });
      } catch (e) {
        log('Querying bot factories unsuccessful.');
        log(e);
        return;
      }
      setFactories(factoriesResult.map(({ attributes: { topic, name }, names }) => ({
        topic,
        name,
        names
      })));
    };

    queryRegistry();
  }, [registry]);

  return factories;
};
