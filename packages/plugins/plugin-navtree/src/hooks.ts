//
// Copyright 2025 DXOS.org
//

import { type Atom, useAtomValue } from '@effect-atom/atom-react';
import { useEffect, useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/react';
import { type Node } from '@dxos/app-graph';

import { useNavTreeContext } from './components';
import { NavTreeCapabilities } from './types';

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
  getItem: (path: string[]) => NavTreeCapabilities.NavTreeItemState;
  getItemAtom: (path: string[]) => Atom.Atom<NavTreeCapabilities.NavTreeItemState>;
  setItem: (path: string[], key: 'open' | 'current' | 'alternateTree', next: boolean) => void;
};

/**
 * Hook that provides access to navtree state functions.
 * For reactive subscriptions, use `useNavTreeItemState` or `useAtomValue(getItemAtom(path))`.
 */
export const useNavTreeState = (): UseNavTreeStateResult => {
  return useCapability(NavTreeCapabilities.State);
};

/**
 * Hook that subscribes to a single navtree item's state.
 * Use this for fine-grained reactivity.
 */
export const useNavTreeItemState = (path: string[]): NavTreeCapabilities.NavTreeItemState => {
  const { getItemAtom } = useCapability(NavTreeCapabilities.State);
  // Memoize the path to avoid creating new atoms on every render.
  const pathKey = useMemo(() => path.join('~'), [path]);
  const atom = useMemo(() => getItemAtom(path), [getItemAtom, pathKey]);
  return useAtomValue(atom);
};

/**
 * Hook that subscribes to the open state for a tree item.
 * Designed to be passed to Tree component as useIsOpen prop.
 */
export const useIsOpen = (path: string[], _item?: any): boolean => {
  return useNavTreeItemState(path).open;
};

/**
 * Hook that subscribes to the current state for a tree item.
 * Designed to be passed to Tree component as useIsCurrent prop.
 */
export const useIsCurrent = (path: string[], _item?: any): boolean => {
  return useNavTreeItemState(path).current;
};

/**
 * Hook that subscribes to the alternateTree state for a tree item.
 */
export const useIsAlternateTree = (path: string[], _item?: any): boolean => {
  return useNavTreeItemState(path).alternateTree ?? false;
};
