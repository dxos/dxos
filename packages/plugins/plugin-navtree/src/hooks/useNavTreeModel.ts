//
// Copyright 2025 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import { useMemo } from 'react';

import { useGraphTreeModel } from '@dxos/plugin-graph/hooks';
import { type TreeModel } from '@dxos/react-ui-list';

import { NavTreeNode } from '#types';

import { useNavTreeState } from './useNavTreeState.ts';

/** The graph tree model with the navtree's persisted open/current state. */
export const useNavTreeModel = (rootId: string): TreeModel<NavTreeNode.NavTreeItemGraphNode> => {
  const { getItemAtom } = useNavTreeState();
  const state = useMemo(
    () => ({
      itemOpen: (path: string[]) => Atom.make((get) => get(getItemAtom(path)).open).pipe(Atom.keepAlive),
      itemCurrent: (path: string[]) => Atom.make((get) => get(getItemAtom(path)).current).pipe(Atom.keepAlive),
    }),
    [getItemAtom],
  );
  return useGraphTreeModel(rootId, state);
};
