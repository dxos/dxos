//
// Copyright 2025 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import { useMemo } from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as DeckSchema from '@dxos/plugin-deck/DeckSchema';
import { useGraphTreeModel } from '@dxos/plugin-graph/hooks';
import { type TreeModel } from '@dxos/react-ui-list';

import { NavTreeNode } from '#types';

import { useNavTreeState } from './useNavTreeState.ts';

// TODO(wittjosiah): Move companion nodes to their own edge category so this filter is unnecessary.
const isVisible = (node: AppGraphNode.Node): boolean => node.type !== DeckSchema.PLANK_COMPANION_TYPE;

/** The graph tree model with the navtree's persisted open/current state. */
export const useNavTreeModel = (rootId: string): TreeModel<NavTreeNode.NavTreeItemGraphNode> => {
  const { getItemAtom } = useNavTreeState();
  const state = useMemo(
    () => ({
      itemOpen: (path: string[]) => Atom.make((get) => get(getItemAtom(path)).open).pipe(Atom.keepAlive),
      itemCurrent: (path: string[]) => Atom.make((get) => get(getItemAtom(path)).current).pipe(Atom.keepAlive),
      isVisible,
    }),
    [getItemAtom],
  );
  return useGraphTreeModel(rootId, state);
};
