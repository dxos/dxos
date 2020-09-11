//
// Copyright 2020 DXOS.org
//

import { createContext, useEffect, useContext, useState, useRef } from 'react';

import { humanize, keyToString } from '@dxos/crypto';
import { truncateString } from '@dxos/debug';
import { Database, Party, Item } from '@dxos/experimental-echo-db';

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

  useEffect(() => {
    let unsubscribe;
    setImmediate(async () => {
      // TODO(burdon): Make synchronous?
      const result = await database.queryParties();
      unsubscribe = result.subscribe(() => {
        setParties(result.value);
      });

      setParties(result.value);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [database]);

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
  id, partyMap: Map<string, { party: Party, items: Item<any>[] }> = undefined
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
  const subscriptions = useRef(new Map<string, Function>([]));
  const partyMap = useRef(new Map<string, { party: Party, items: Item<any>[] }>());
  const [data, setData] = useState<GraphData>(createGraphData(id));
  const parties = useParties();

  // TODO(burdon): For open parties only.
  useEffect(() => {
    // Remove obsolete parties.
    partyMap.current.forEach(({ party }) => {
      if (!parties.find(p => Buffer.compare(p.key, party.key) !== 0)) {
        const partyKey = keyToString(party.key);
        subscriptions.current.get(partyKey)();
        subscriptions.current.delete(partyKey);
        partyMap.current.delete(partyKey);
      }
    });

    // Create party subscriptions.
    parties.forEach(async party => {
      const partyKey = keyToString(party.key);
      if (!subscriptions.current.has(partyKey)) {
        const result = await party.queryItems();
        const updateParty = () => {
          partyMap.current.set(partyKey, { party, items: result.value });
          setData(createGraphData(id, partyMap.current));
        };

        subscriptions.current.set(partyKey, result.subscribe(updateParty));
        updateParty();
      }
    });

    // Update.
    setData(createGraphData(id, partyMap.current));

    return () => {
      for (const unsubscribe of subscriptions.current.values()) {
        unsubscribe();
      }
    };
  }, [parties]);

  return data;
};
