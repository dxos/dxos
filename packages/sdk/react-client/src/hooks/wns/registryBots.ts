//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import { useState, useEffect } from 'react';

import { useWNSRegistry } from './registry.js';
import { QueryRecord, WRN_TYPE_BOT } from './types.js';

const log = debug('dxos:react-client');

interface RegistryBotRecord {
  version: string
  name: string
  names: string[]
  keywords: string[]
}

export interface UseRegistryBotsProps {
  sortByKeywords?: string[]
}

/**
 * A hook returning all bots registered on the DXNS registry.
 * Bots can be spawned into Parties through bot factories.
 * See also: `useRegistryBotFactories` hook.
 * @param props.sortByKeywords sort the registries by keywords of interest
 * @returns an array of registered bots
 */
export const useRegistryBots = (props: UseRegistryBotsProps = {}) => {
  const { sortByKeywords } = props;
  const registry = useWNSRegistry();
  const [registryBots, setRegistryBots] = useState<RegistryBotRecord[]>([]);

  useEffect(() => {
    if (!registry) {
      return;
    }

    const queryRegistry = async () => {
      let botsResult: QueryRecord[];
      try {
        botsResult = await registry.queryRecords({ type: WRN_TYPE_BOT });
      } catch (e: any) {
        log('Querying bots unsuccessful.');
        log(e);
        return;
      }
      const botRecords: RegistryBotRecord[] = botsResult.map(({ attributes: { version, name, keywords = [] }, names }) => ({
        version,
        name,
        names,
        keywords
      }));

      if (sortByKeywords === undefined) {
        setRegistryBots(botRecords);
      } else {
        const filterByKeywords = (bot: RegistryBotRecord) => bot.keywords.some(botKeyword => sortByKeywords.includes(botKeyword));
        const sortedBotRecords = [
          ...botRecords.filter(bot => filterByKeywords(bot)),
          ...botRecords.filter(bot => !filterByKeywords(bot))
        ];
        setRegistryBots(sortedBotRecords);
      }
    };

    void queryRegistry();
  }, [registry]);

  return registryBots;
};
