//
// Copyright 2023 DXOS.org
//

import { DeepSignal, deepSignal } from 'deepsignal/react';
import update from 'lodash.update';

import { NodeKey, RelationKey, SessionGraph, SessionNode } from './types';

export const NAVMENU_ROOT = 'NAVMENU_ROOT';

export const sessionGraph: SessionGraph = {
  nodes: deepSignal({
    [NAVMENU_ROOT]: { id: NAVMENU_ROOT, label: 'never' },
  } as Record<NodeKey, SessionNode>),
  relations: deepSignal({}),
};

export type AddNodesResult = { added: Record<NodeKey, SessionNode>; failed: Record<NodeKey, SessionNode> };

export const addNodes = (...nodes: SessionNode[]): AddNodesResult =>
  nodes.reduce(
    (acc: AddNodesResult, node) => {
      if (sessionGraph.nodes[node.id]) {
        acc.failed[node.id] = node;
      } else {
        sessionGraph.nodes[node.id] = node as DeepSignal<SessionNode>;
        acc.added[node.id] = node;
      }
      return acc;
    },
    { added: {}, failed: {} },
  );

export const upsertNodes = (...nodes: SessionNode[]) =>
  nodes.forEach((node) => {
    sessionGraph.nodes[node.id] = node as DeepSignal<SessionNode>;
  });

export type RelationParams = { by: NodeKey; of: NodeKey | NodeKey[]; as: RelationKey };

export const addRelations = (...relations: RelationParams[]) =>
  relations.forEach((relation) => {
    update(sessionGraph.relations, [relation.by, relation.as], (value) => {
      const nextSet: Set<NodeKey> = value || new Set();
      Array.isArray(relation.of) ? relation.of.forEach((key) => nextSet.add(key)) : nextSet.add(relation.of);
      return nextSet;
    });
  });
