//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { truncateString } from '@dxos/debug';
import { Party, Item } from '@dxos/echo-db';
import { PartyKey } from '@dxos/echo-protocol';
import {
  OBJECT_ORG, OBJECT_PERSON, OBJECT_PROJECT, OBJECT_TASK, LINK_EMPLOYEE, LINK_PROJECT
} from '@dxos/echo-testing';
import { useParties } from '@dxos/react-client';
import { ComplexMap } from '@dxos/util';

import { asyncEffect, liftCallback } from './util';

// TODO(burdon): Move to @dxos/gem.
interface GraphData {
  nodes: any[],
  links: any[]
}

export const graphSelector = adapter => selection => {
  const nodes = [];
  const links = [];

  selection
    .filter({ type: OBJECT_ORG })
    .each(item => nodes.push({ id: item.id, type: OBJECT_ORG, title: adapter.primary(item) }))
    .call(selection => {
      selection.links({ type: LINK_PROJECT })
        .each(link => {
          nodes.push({ id: link.target.id, type: OBJECT_PROJECT, title: adapter.primary(link.target) });
          links.push({ id: link.id, source: link.source.id, target: link.target.id });
        })
        .target()
        .children()
        .each(item => {
          nodes.push({ id: item.id, type: OBJECT_TASK, title: adapter.primary(item) });
          links.push({ id: `${item.parent.id}-${item.id}`, source: item.parent.id, target: item.id });
        });
    })
    .links({ type: LINK_EMPLOYEE })
    .each(link => links.push({ id: link.id, source: link.source.id, target: link.target.id }))
    .target()
    .each(item => nodes.push({ id: item.id, type: OBJECT_PERSON, title: adapter.primary(item) }));

  return { nodes, links };
};

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
      const partyKey = party.key;

      data.nodes.push({
        id: partyKey.toHex(),
        type: 'party',
        title: `Party(${party.key.humanize()})`,
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
    const partyMap = new ComplexMap<PartyKey, { party: Party, items: Item<any>[] }>(key => key.toHex());

    for (const party of parties) {
      partyMap.set(party.key, { party, items: [] });
    }

    setData(createGraphData(id, partyMap));

    return liftCallback(await Promise.all(parties.map(async party => {
      const result = await party.database.queryItems();

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
