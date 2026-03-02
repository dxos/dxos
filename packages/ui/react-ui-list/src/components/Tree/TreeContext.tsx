//
// Copyright 2024 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';
import { type Label } from '@dxos/react-ui';

export type TreeItemDataProps = {
  id: string;
  label: Label;
  parentOf?: string[];
  className?: string;
  headingClassName?: string;
  icon?: string;
  iconHue?: string;
  disabled?: boolean;
  testId?: string;
};

export interface TreeModel<T extends { id: string } = any> {
  /** Atom family: resolve item by ID (content). */
  item: (id: string) => Atom.Atom<T | undefined>;
  /** Atom family: open state keyed by path. */
  itemOpen: (path: string[]) => Atom.Atom<boolean>;
  /** Atom family: current (selected) state keyed by path. */
  itemCurrent: (path: string[]) => Atom.Atom<boolean>;
  /** Atom family: display props for an item at a given path (path includes item's own ID at end). */
  itemProps: (path: string[]) => Atom.Atom<TreeItemDataProps>;
  /** Atom family: outbound child IDs for a parent ID (topology). Undefined = root. */
  childIds: (parentId?: string) => Atom.Atom<string[]>;
}

const TreeContext = createContext<TreeModel | null>(null);

export const TreeProvider = TreeContext.Provider;

export const useTree = () => useContext(TreeContext) ?? raise(new Error('TreeContext not found'));
