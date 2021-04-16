//
// Copyright 2020 DXOS.org
//

import { createContext, useEffect, useContext, useState, useMemo } from 'react';

import { ECHO, Party, Item } from '@dxos/echo-db';

import { asyncEffect, useResultSet } from './util';

//
// SDK Prototype.
//

interface Context {
  echo: ECHO
}

export const EchoContext = createContext<Context>(null);

/**
 * Get ECHO instance.
 */
export const useEcho = (): ECHO => {
  const { echo } = useContext(EchoContext);
  return echo;
};

/**
 * Get parties.
 */
export const useParties = (): Party[] => {
  const { echo } = useContext(EchoContext);
  const [parties, setParties] = useState<Party[]>([]);

  useEffect(asyncEffect(async () => {
    const result = await echo.queryParties();
    setParties(result.value);

    return result.subscribe(() => {
      setParties(result.value);
    });
  }), [echo]);

  return parties;
};

/**
 * Get items for pary.
 * @param partyKey
 */
export const useItems = ({ partyKey }): Item<any>[] => {
  const { echo } = useContext(EchoContext);
  const [items, setItems] = useState<Item<any>[]>([]);

  useEffect(() => {
    let unsubscribe;
    setImmediate(async () => {
      const party = await echo.getParty(partyKey);
      const result = await party.database.queryItems();
      unsubscribe = result.subscribe(() => {
        setItems(result.value);
      });

      setItems(result.value);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return items;
};

/**
 * Get members for party.
 * @param party
 */
export const usePartyMembers = (party: Party) => {
  return useResultSet(useMemo(() => party.queryMembers(), [party.key.toHex()]));
};
