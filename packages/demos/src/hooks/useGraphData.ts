//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { Party, Item, Database } from '@dxos/client';
import { truncateString } from '@dxos/debug';
import { PartyKey } from '@dxos/echo-protocol';
import {
  OBJECT_ORG, OBJECT_PERSON, OBJECT_PROJECT, OBJECT_TASK, LINK_EMPLOYEE, LINK_PROJECT
} from '@dxos/echo-testing';
import { useParties, useSelection } from '@dxos/react-client';
import { ComplexMap } from '@dxos/util';

import type { ItemAdapter } from '../components';
import { GraphData, Link, Node } from '../models';
import { asyncEffect, liftCallback } from './util';

export const useGraphSelection = (adapter: ItemAdapter, database: Database, deps: readonly any[] = []) => {
  const orgs = database.select({ type: OBJECT_ORG });

  const projects = orgs.links({ type: LINK_PROJECT });
  const tasks = projects.target().children();

  const employees = orgs.links({ type: LINK_EMPLOYEE });

  const nodes: Node[] = [
    ...(useSelection(orgs, deps) ?? []).map(item => ({ id: item.id, type: OBJECT_ORG, title: adapter.primary(item) })),
    ...(useSelection(projects, deps) ?? []).map(link => ({ id: link.target.id, type: OBJECT_PROJECT, title: adapter.primary(link.target) })),
    ...(useSelection(tasks, deps) ?? []).map(item => ({ id: item.id, type: OBJECT_TASK, title: adapter.primary(item) })),
    ...(useSelection(employees, deps) ?? []).map(link => ({ id: link.target.id, type: OBJECT_PERSON, title: adapter.primary(link.target) }))
  ];

  const links: Link[] = [
    ...(useSelection(projects, deps) ?? []).map(link => ({ id: link.id, source: link.source.id, target: link.target.id })),
    ...(useSelection(tasks, deps) ?? []).map(item => ({ id: `${item.parent!.id}-${item.id}`, source: item.parent!.id, target: item.id })),
    ...(useSelection(employees, deps) ?? []).map(link => ({ id: link.id, source: link.source.id, target: link.target.id }))
  ];

  return { nodes, links };
};

const createGraphData = (
  id: string, partyMap?: ComplexMap<PartyKey, { party: Party, items: Item<any>[] }>
) => {
  const rootId = `__root_${id}__`;
  const data: {nodes: Node[], links: Link[]} = {
    nodes: [
      {
        id: rootId,
        type: 'database',
        title: `ECHO(${id})`
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
        partyKey: party.key.toHex()
      });

      data.links.push({
        id: `${rootId}-${partyKey}`,
        source: rootId,
        target: partyKey.toHex()
      });

      items.forEach(item => {
        data.nodes.push({
          id: item.id,
          type: 'item',
          title: `Item(${truncateString(item.id, 3)})`,
          partyKey: party.key.toHex()
        });

        const id = item.parent ? item.parent.id : partyKey.toHex();
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
export const useGraphData = ({ id }: {id: string}) => {
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
      const result = party.database.select().query();

      partyMap.set(party.key, { party, items: result.result });
      setData(createGraphData(id, partyMap));
      return result.update.on(() => {
        partyMap.set(party.key, { party, items: result.result });
        setData(createGraphData(id, partyMap));
      });
    })));
  }), [parties]);

  return data;
};
