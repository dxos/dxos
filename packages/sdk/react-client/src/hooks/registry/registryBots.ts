//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import { useState, useEffect } from 'react';

import { useRegistry } from './registry';
import { QueryRecord, WRN_TYPE_BOT } from './types';

const log = debug('dxos:react-client');

interface RegistryBotRecord {
  version: string,
  name: string,
  names: string[],
  keywords: string[]
}

export interface UseRegistryBotsProps {
  sortByKeywords?: string[],
}

export const useRegistryBots = ({ sortByKeywords }: UseRegistryBotsProps = {}) => {
  const registry = useRegistry();
  const [registryBots, setRegistryBots] = useState<RegistryBotRecord[]>([]);

  useEffect(() => {
    if (!registry) {
      return;
    }

    const queryRegistry = async () => {
      let botsResult: QueryRecord[];
      try {
        botsResult = await registry.queryRecords({ type: WRN_TYPE_BOT });
      } catch (e) {
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

    queryRegistry();
  }, [registry]);

  return registryBots;
};
