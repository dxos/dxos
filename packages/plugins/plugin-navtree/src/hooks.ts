//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import { useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useEffect } from 'react';

import { useCapability } from '@dxos/app-framework/react';
import { type Node } from '@dxos/app-graph';
import { Path } from '@dxos/react-ui-list';

import { useNavTreeContext } from './components';
import { NavTreeCapabilities, type NavTreeItemGraphNode } from './types';

export const useLoadDescendents = (root?: Node.Node) => {
  const { loadDescendents } = useNavTreeContext();
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (root) {
        void loadDescendents?.(root);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [root]);
};

export type UseNavTreeStateResult = {
  stateAtom: Atom.Writable<NavTreeCapabilities.NavTreeState>;
  state: NavTreeCapabilities.NavTreeState;
  getItem: (path: string[]) => NavTreeCapabilities.NavTreeItemState;
  setItem: (path: string[], key: 'open' | 'current' | 'alternateTree', next: boolean) => void;
  isOpen: (path: string[], item?: NavTreeItemGraphNode) => boolean;
  isCurrent: (path: string[], item?: NavTreeItemGraphNode) => boolean;
  isAlternateTree: (path: string[], item?: NavTreeItemGraphNode) => boolean;
};

/**
 * Hook that subscribes to navtree state and provides reactive accessor functions.
 * Use this instead of the capability's functions directly when you need reactivity.
 */
export const useNavTreeState = (): UseNavTreeStateResult => {
  const { stateAtom, setItem } = useCapability(NavTreeCapabilities.State);
  const state = useAtomValue(stateAtom);

  const getItem = useCallback(
    (path: string[]): NavTreeCapabilities.NavTreeItemState => {
      const pathString = Path.create(...path);
      return state.get(pathString) ?? { open: false, current: false, alternateTree: false };
    },
    [state],
  );

  const isOpen = useCallback((path: string[], _item?: NavTreeItemGraphNode) => getItem(path).open, [getItem]);

  const isCurrent = useCallback((path: string[], _item?: NavTreeItemGraphNode) => getItem(path).current, [getItem]);

  const isAlternateTree = useCallback(
    (path: string[], _item?: NavTreeItemGraphNode) => getItem(path).alternateTree ?? false,
    [getItem],
  );

  return {
    stateAtom,
    state,
    getItem,
    setItem,
    isOpen,
    isCurrent,
    isAlternateTree,
  };
};
