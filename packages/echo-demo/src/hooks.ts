//
// Copyright 2020 DXOS.org
//

import { createContext, useEffect, useContext, useState } from 'react';

import { humanize, keyToString } from '@dxos/crypto';
import { truncateString } from '@dxos/debug';
import { Database, Party, Item } from '@dxos/echo-db';
import { PartyKey } from '@dxos/echo-protocol';

import { ComplexMap } from '../../util/dist/src';

//
// SDK Prototype.
//

interface Context {
  database: Database
}

export const EchoContext = createContext<Context>(null);

/**
 * Get database.
 */
export const useDatabase = (): Database => {
  const { database } = useContext(EchoContext);
  return database;
};

/**
 * Get parties.
 */
export const useParties = (): Party[] => {
  const { database } = useContext(EchoContext);
  const [parties, setParties] = useState<Party[]>([]);

  useEffect(asyncEffect(async () => {
    const result = await database.queryParties();
    setParties(result.value);

    return result.subscribe(() => {
      setParties(result.value);
    });
  }), [database]);

  return parties;
};

export const useItems = ({ partyKey }): Item<any>[] => {
  const { database } = useContext(EchoContext);
  const [items, setItems] = useState<Item<any>[]>([]);

  useEffect(() => {
    let unsubscribe;
    setImmediate(async () => {
      const party = await database.getParty(partyKey);
      const result = await party.queryItems();
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

// TODO(burdon): Move to @dxos/gem.
interface GraphData {
  nodes: any[],
  links: any[]
}

const createGraphData = (
  id, partyMap: ComplexMap<PartyKey, { party: Party, items: Item<any>[] }> = undefined
) => {
  const rootId = `__root_${id}__`;
  const data = {
    nodes: [
      {
        id: rootId,
        type: 'database',
        title: `ECHO(${id})`,
        partyKey: null
      }
    ],
    links: []
  };

  if (partyMap) {
    for (const { party, items } of partyMap.values()) {
      const partyKey = keyToString(party.key);

      data.nodes.push({
        id: partyKey,
        type: 'party',
        title: `Party(${humanize(party.key)})`,
        partyKey: party.key
      });

      data.links.push({
        id: `${rootId}-${partyKey}`,
        source: rootId,
        target: partyKey
      });

      items.forEach(item => {
        data.nodes.push({
          id: item.id,
          type: 'item',
          title: `Item(${truncateString(item.id, 3)})`,
          partyKey: party.key
        });

        const id = item.parent ? item.parent.id : partyKey;
        data.links.push({
          id: `${id}-${item.id}`,
          source: id,
          target: item.id
        });
      });
    }
  }

  return data;
};

/**
 * Generate GEM graph data.
 */
export const useGraphData = ({ id }) => {
  const [data, setData] = useState<GraphData>(createGraphData(id));
  const parties = useParties();

  // TODO(burdon): For open parties only.
  useEffect(asyncEffect(async () => {
    const partyMap = new ComplexMap<PartyKey, { party: Party, items: Item<any>[] }>(keyToString);

    for (const party of parties) {
      // console.log(party, party.key);
      partyMap.set(party.key, { party, items: [] });
    }
    setData(createGraphData(id, partyMap));

    return liftCallback(await Promise.all(parties.map(async party => {
      const result = await party.queryItems();

      partyMap.set(party.key, { party, items: result.value });
      setData(createGraphData(id, partyMap));
      return result.subscribe(() => {
        partyMap.set(party.key, { party, items: result.value });
        setData(createGraphData(id, partyMap));
      });
    })));
  }), [parties]);

  return data;
};

/**
 * Turn array of callbacks into a single callback that calls them all.
 * @param callbacks
 */
function liftCallback (callbacks: (() => void)[]): () => void {
  return () => callbacks.forEach(cb => cb());
}

/**
 * Helper to use async functions inside effects
 */
function asyncEffect (fun: () => Promise<(() => void) | undefined>): () => (() => void) | undefined {
  return () => {
    const promise = fun();
    return () => promise.then(cb => cb?.());
  };
}
